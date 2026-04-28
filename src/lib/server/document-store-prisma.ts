import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type {
  StoredComment,
  StoredDocument,
  StoredPage,
} from "@/lib/documents-types";
import { prisma } from "@/lib/server/prisma";

function toTimestamp(date: Date): number {
  return date.getTime();
}

// Assembles a StoredDocument from a Document row + its related Page rows + SharedPage rows.
function assembleDocument(
  doc: {
    id: string;
    title: string;
    content: string;
    pages: unknown;
    activePageId: string;
    ownerId: string;
    isPublic: boolean;
    sharedPageIds: string[];
    createdAt: Date;
    updatedAt: Date;
    docPages?: Array<{ id: string; title: string; content: string; position: number; createdAt: Date; updatedAt: Date }>;
    sharedPages?: Array<{ pageId: string }>;
  }
): StoredDocument {
  // Prefer new Page table rows; fall back to legacy Json column
  let pages: StoredPage[];
  if (doc.docPages && doc.docPages.length > 0) {
    pages = [...doc.docPages]
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        createdAt: toTimestamp(p.createdAt),
        updatedAt: toTimestamp(p.updatedAt),
      }));
  } else {
    pages = parseLegacyPages(doc.pages);
  }

  // Prefer new SharedPage table; fall back to legacy sharedPageIds array
  const sharedPageIds =
    doc.sharedPages && doc.sharedPages.length > 0
      ? doc.sharedPages.map((s) => s.pageId)
      : (doc.sharedPageIds ?? []);

  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    pages,
    activePageId: doc.activePageId,
    ownerId: doc.ownerId,
    isPublic: doc.isPublic ?? false,
    sharedPageIds,
    createdAt: toTimestamp(doc.createdAt),
    updatedAt: toTimestamp(doc.updatedAt),
  };
}

function parseLegacyPages(input: unknown): StoredPage[] {
  if (!Array.isArray(input)) return [];
  return input.filter((page): page is StoredPage => (
    typeof page === "object" && page !== null &&
    typeof (page as StoredPage).id === "string" &&
    typeof (page as StoredPage).title === "string" &&
    typeof (page as StoredPage).content === "string" &&
    typeof (page as StoredPage).createdAt === "number" &&
    typeof (page as StoredPage).updatedAt === "number"
  ));
}

const docPageInclude = {
  docPages: { select: { id: true, title: true, content: true, position: true, createdAt: true, updatedAt: true } },
  sharedPages: { select: { pageId: true } },
} as const;

export async function getPublicDocumentPrisma(id: string): Promise<StoredDocument | null> {
  const row = await prisma.document.findFirst({
    where: { id, isPublic: true },
    include: docPageInclude,
  });
  if (!row) return null;
  const doc = assembleDocument(row);
  // A doc is public if it has shared pages in either store
  if (!doc.sharedPageIds?.length) return null;
  return doc;
}

function toStoredComment(record: {
  id: string; documentId: string; userId: string;
  content: string; author: string; createdAt: Date;
}): StoredComment {
  return {
    id: record.id,
    documentId: record.documentId,
    userId: record.userId,
    content: record.content,
    author: record.author,
    createdAt: toTimestamp(record.createdAt),
  };
}

export async function listDocumentsPrisma(userId: string): Promise<StoredDocument[]> {
  const rows = await prisma.document.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: docPageInclude,
  });
  return rows.map(assembleDocument);
}

export async function getDocumentPrisma(id: string, userId: string): Promise<StoredDocument | null> {
  const row = await prisma.document.findFirst({
    where: { id, ownerId: userId },
    include: docPageInclude,
  });
  if (!row) return null;
  return assembleDocument(row);
}

export async function createDocumentPrisma(
  userId: string,
  input?: { title?: string; content?: string },
): Promise<StoredDocument> {
  const now = Date.now();
  const title = input?.title?.trim() || "Untitled";
  const content = input?.content || "<p></p>";
  const docId = randomUUID();
  const pageId = randomUUID();

  const legacyPages: StoredPage[] = [{ id: pageId, title, content, createdAt: now, updatedAt: now }];

  const row = await prisma.document.create({
    data: {
      id: docId,
      title,
      content,
      pages: legacyPages as unknown as Prisma.InputJsonValue,
      activePageId: pageId,
      ownerId: userId,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      // Write to new Page table
      docPages: {
        create: [{ id: pageId, title, content, position: 0, createdAt: new Date(now), updatedAt: new Date(now) }],
      },
    },
    include: docPageInclude,
  });

  return assembleDocument(row);
}

export async function upsertDocumentPrisma(
  userId: string,
  document: StoredDocument,
): Promise<StoredDocument> {
  const now = new Date(document.updatedAt);

  // Dual-write: update Document row (legacy columns) + sync Page rows + sync SharedPage rows
  await prisma.$transaction(async (tx) => {
    // 1. Upsert the Document row (keep legacy columns in sync for rollback safety)
    await tx.document.upsert({
      where: { id: document.id },
      update: {
        title: document.title,
        content: document.content,
        pages: document.pages as unknown as Prisma.InputJsonValue,
        activePageId: document.activePageId,
        ownerId: userId,
        isPublic: document.isPublic ?? false,
        sharedPageIds: document.sharedPageIds ?? [],
        updatedAt: now,
      },
      create: {
        id: document.id,
        title: document.title,
        content: document.content,
        pages: document.pages as unknown as Prisma.InputJsonValue,
        activePageId: document.activePageId,
        ownerId: userId,
        isPublic: document.isPublic ?? false,
        sharedPageIds: document.sharedPageIds ?? [],
        createdAt: new Date(document.createdAt),
        updatedAt: now,
      },
    });

    // 2. Sync Page rows — upsert each page, delete removed ones
    for (const [i, page] of document.pages.entries()) {
      await tx.page.upsert({
        where: { id: page.id },
        update: {
          title: page.title,
          content: page.content,
          position: i,
          updatedAt: new Date(page.updatedAt),
        },
        create: {
          id: page.id,
          documentId: document.id,
          title: page.title,
          content: page.content,
          position: i,
          createdAt: new Date(page.createdAt),
          updatedAt: new Date(page.updatedAt),
        },
      });
    }

    // Delete Page rows no longer in the document
    const currentPageIds = document.pages.map((p) => p.id);
    await tx.page.deleteMany({
      where: { documentId: document.id, id: { notIn: currentPageIds } },
    });

    // 3. Sync SharedPage rows
    const desiredSharedIds = document.sharedPageIds ?? [];
    const existingShared = await tx.sharedPage.findMany({
      where: { documentId: document.id },
      select: { pageId: true },
    });
    const existingIds = existingShared.map((s) => s.pageId);
    const toAdd = desiredSharedIds.filter((id) => !existingIds.includes(id));
    const toRemove = existingIds.filter((id) => !desiredSharedIds.includes(id));

    if (toAdd.length > 0) {
      await tx.sharedPage.createMany({
        data: toAdd.map((pageId) => ({ documentId: document.id, pageId })),
        skipDuplicates: true,
      });
    }
    if (toRemove.length > 0) {
      await tx.sharedPage.deleteMany({
        where: { documentId: document.id, pageId: { in: toRemove } },
      });
    }
  });

  // Re-fetch to return the fresh assembled document
  const row = await prisma.document.findFirst({
    where: { id: document.id },
    include: docPageInclude,
  });

  return assembleDocument(row!);
}

export async function deleteDocumentPrisma(id: string, userId: string): Promise<boolean> {
  const result = await prisma.document.deleteMany({
    where: { id, ownerId: userId },
  });
  return result.count > 0;
}

export async function listCommentsPrisma(documentId: string, userId: string): Promise<StoredComment[]> {
  const rows = await prisma.comment.findMany({
    where: { documentId, document: { ownerId: userId } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toStoredComment);
}

export async function addCommentPrisma(
  documentId: string,
  userId: string,
  content: string,
  author = "You",
): Promise<StoredComment> {
  const row = await prisma.comment.create({
    data: {
      id: randomUUID(),
      documentId,
      userId,
      content: content.trim(),
      author,
      createdAt: new Date(),
    },
  });
  return toStoredComment(row);
}
