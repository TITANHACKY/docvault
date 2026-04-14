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

function parsePages(input: unknown): StoredPage[] {
  if (!Array.isArray(input)) return [];

  return input.filter((page): page is StoredPage => {
    return (
      typeof page === "object" &&
      page !== null &&
      typeof (page as StoredPage).id === "string" &&
      typeof (page as StoredPage).title === "string" &&
      typeof (page as StoredPage).content === "string" &&
      typeof (page as StoredPage).createdAt === "number" &&
      typeof (page as StoredPage).updatedAt === "number"
    );
  });
}

function toStoredDocument(record: {
  id: string;
  title: string;
  content: string;
  pages: unknown;
  activePageId: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}): StoredDocument {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    pages: parsePages(record.pages),
    activePageId: record.activePageId,
    ownerId: record.ownerId,
    createdAt: toTimestamp(record.createdAt),
    updatedAt: toTimestamp(record.updatedAt),
  };
}

function toStoredComment(record: {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  author: string;
  createdAt: Date;
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

export async function listDocumentsPrisma(
  userId: string,
): Promise<StoredDocument[]> {
  const rows = await prisma.document.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map(toStoredDocument);
}

export async function getDocumentPrisma(
  id: string,
  userId: string,
): Promise<StoredDocument | null> {
  const row = await prisma.document.findFirst({
    where: { id, ownerId: userId },
  });

  if (!row) return null;
  return toStoredDocument(row);
}

export async function createDocumentPrisma(
  userId: string,
  input?: {
    title?: string;
    content?: string;
  },
): Promise<StoredDocument> {
  const now = Date.now();
  const title = input?.title?.trim() || "Untitled";
  const content = input?.content || "<p></p>";
  const pageId = randomUUID();

  const pages: StoredPage[] = [
    {
      id: pageId,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const row = await prisma.document.create({
    data: {
      id: randomUUID(),
      title,
      content,
      pages: pages as unknown as Prisma.InputJsonValue,
      activePageId: pageId,
      ownerId: userId,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
  });

  return toStoredDocument(row);
}

export async function upsertDocumentPrisma(
  userId: string,
  document: StoredDocument,
): Promise<StoredDocument> {
  const row = await prisma.document.upsert({
    where: { id: document.id },
    update: {
      title: document.title,
      content: document.content,
      pages: document.pages as unknown as Prisma.InputJsonValue,
      activePageId: document.activePageId,
      ownerId: userId,
      createdAt: new Date(document.createdAt),
      updatedAt: new Date(document.updatedAt),
    },
    create: {
      id: document.id,
      title: document.title,
      content: document.content,
      pages: document.pages as unknown as Prisma.InputJsonValue,
      activePageId: document.activePageId,
      ownerId: userId,
      createdAt: new Date(document.createdAt),
      updatedAt: new Date(document.updatedAt),
    },
  });

  return toStoredDocument(row);
}

export async function deleteDocumentPrisma(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await prisma.document.deleteMany({
    where: { id, ownerId: userId },
  });

  return result.count > 0;
}

export async function listCommentsPrisma(
  documentId: string,
  userId: string,
): Promise<StoredComment[]> {
  const rows = await prisma.comment.findMany({
    where: {
      documentId,
      document: { ownerId: userId },
    },
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
