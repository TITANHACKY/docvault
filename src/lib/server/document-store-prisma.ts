import { randomUUID } from "node:crypto";
import type {
  StoredComment,
  StoredDocument,
  StoredPage,
} from "@/lib/documents-types";
import { prisma } from "@/lib/server/prisma";

function toTimestamp(date: Date): number {
  return date.getTime();
}

const docPageInclude = {
  docPages: {
    select: { id: true, title: true, content: true, position: true, isShared: true, createdAt: true, updatedAt: true },
    orderBy: { position: "asc" as const },
  },
} as const;

function assembleDocument(doc: {
  id: string;
  title: string;
  activePageId: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  docPages: Array<{ id: string; title: string; content: string; position: number; isShared: boolean; createdAt: Date; updatedAt: Date }>;
}): StoredDocument {
  const pages: StoredPage[] = doc.docPages.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    isShared: p.isShared,
    createdAt: toTimestamp(p.createdAt),
    updatedAt: toTimestamp(p.updatedAt),
  }));

  return {
    id: doc.id,
    title: doc.title,
    content: pages.find((p) => p.id === doc.activePageId)?.content ?? pages[0]?.content ?? "<p></p>",
    pages,
    activePageId: doc.activePageId,
    ownerId: doc.ownerId,
    isPublic: pages.some((p) => p.isShared),
    sharedPageIds: pages.filter((p) => p.isShared).map((p) => p.id),
    createdAt: toTimestamp(doc.createdAt),
    updatedAt: toTimestamp(doc.updatedAt),
  };
}

function toStoredComment(record: {
  id: string; pageId: string; userId: string;
  content: string; author: string; createdAt: Date;
}): StoredComment {
  return {
    id: record.id,
    documentId: "",
    pageId: record.pageId,
    userId: record.userId,
    content: record.content,
    author: record.author,
    createdAt: toTimestamp(record.createdAt),
  };
}

export async function getPublicDocumentPrisma(id: string): Promise<StoredDocument | null> {
  const row = await prisma.document.findFirst({
    where: { id, docPages: { some: { isShared: true } } },
    include: docPageInclude,
  });
  if (!row) return null;
  return assembleDocument(row);
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
  const pageId = randomUUID();

  const row = await prisma.document.create({
    data: {
      id: randomUUID(),
      title,
      activePageId: pageId,
      ownerId: userId,
      createdAt: new Date(now),
      updatedAt: new Date(now),
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

  await prisma.$transaction(async (tx) => {
    // 1. Upsert Document row
    await tx.document.upsert({
      where: { id: document.id },
      update: {
        title: document.title,
        activePageId: document.activePageId,
        ownerId: userId,
        updatedAt: now,
      },
      create: {
        id: document.id,
        title: document.title,
        activePageId: document.activePageId,
        ownerId: userId,
        createdAt: new Date(document.createdAt),
        updatedAt: now,
      },
    });

    // 2. Upsert each Page row
    for (const [i, page] of document.pages.entries()) {
      await tx.page.upsert({
        where: { id: page.id },
        update: {
          title: page.title,
          content: page.content,
          position: i,
          isShared: page.isShared ?? false,
          updatedAt: new Date(page.updatedAt),
        },
        create: {
          id: page.id,
          documentId: document.id,
          title: page.title,
          content: page.content,
          position: i,
          isShared: page.isShared ?? false,
          createdAt: new Date(page.createdAt),
          updatedAt: new Date(page.updatedAt),
        },
      });
    }

    // 3. Delete removed pages
    const currentPageIds = document.pages.map((p) => p.id);
    await tx.page.deleteMany({
      where: { documentId: document.id, id: { notIn: currentPageIds } },
    });
  });

  const row = await prisma.document.findFirst({
    where: { id: document.id },
    include: docPageInclude,
  });

  return assembleDocument(row!);
}

export async function deleteDocumentPrisma(id: string, userId: string): Promise<boolean> {
  const result = await prisma.document.deleteMany({ where: { id, ownerId: userId } });
  return result.count > 0;
}

export async function listCommentsPrisma(documentId: string, userId: string): Promise<StoredComment[]> {
  const rows = await prisma.comment.findMany({
    where: { page: { documentId, document: { ownerId: userId } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, pageId: true, userId: true, content: true, author: true, createdAt: true },
  });
  return rows.map(toStoredComment);
}

export async function addCommentPrisma(
  documentId: string,
  userId: string,
  content: string,
  author = "You",
  pageId?: string,
): Promise<StoredComment> {
  // Resolve which page to attach to — use provided pageId, else activePageId of the document
  let targetPageId = pageId;
  if (!targetPageId) {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, ownerId: userId },
      select: { activePageId: true },
    });
    targetPageId = doc?.activePageId;
  }
  if (!targetPageId) throw new Error("Could not resolve pageId for comment");

  const row = await prisma.comment.create({
    data: {
      id: randomUUID(),
      pageId: targetPageId,
      userId,
      content: content.trim(),
      author,
      createdAt: new Date(),
    },
    select: { id: true, pageId: true, userId: true, content: true, author: true, createdAt: true },
  });
  return toStoredComment(row);
}
