import type { StoredComment, StoredDocument } from "@/lib/documents-types";
import {
  addCommentPrisma,
  createDocumentPrisma,
  deleteDocumentPrisma,
  getDocumentPrisma,
  getPublicDocumentPrisma,
  listCommentsPrisma,
  listDocumentsPrisma,
  upsertDocumentPrisma,
} from "@/lib/server/document-store-prisma";
import {
  addCommentFile,
  createDocumentFile,
  deleteDocumentFile,
  getDocumentFile,
  listCommentsFile,
  listDocumentsFile,
  upsertDocumentFile,
} from "@/lib/server/document-store-file";

const STORAGE_MODE = process.env.DOC_STORE_MODE?.toLowerCase() ?? "file";

function isPostgresStore(): boolean {
  // `prisma` is kept as a backward-compatible alias for existing environments.
  return (
    STORAGE_MODE === "postgres" ||
    STORAGE_MODE === "postgresql" ||
    STORAGE_MODE === "prisma"
  );
}

export async function listDocumentsDb(
  userId?: string,
): Promise<StoredDocument[]> {
  if (isPostgresStore()) {
    if (!userId) return [];
    return listDocumentsPrisma(userId);
  }
  return listDocumentsFile();
}

export async function getDocumentDb(
  id: string,
  userId?: string,
): Promise<StoredDocument | null> {
  if (isPostgresStore()) {
    if (!userId) return null;
    return getDocumentPrisma(id, userId);
  }
  return getDocumentFile(id);
}

export async function createDocumentDb(input?: {
  title?: string;
  content?: string;
  ownerId?: string;
}): Promise<StoredDocument> {
  if (isPostgresStore()) {
    if (!input?.ownerId) {
      throw new Error("ownerId required for postgres document create");
    }
    return createDocumentPrisma(input.ownerId, input);
  }
  return createDocumentFile(input);
}

export async function upsertDocumentDb(
  document: StoredDocument,
  userId?: string,
): Promise<StoredDocument> {
  if (isPostgresStore()) {
    if (!userId) {
      throw new Error("userId required for postgres document upsert");
    }
    return upsertDocumentPrisma(userId, document);
  }
  return upsertDocumentFile(document);
}

export async function getPublicDocumentDb(id: string): Promise<StoredDocument | null> {
  if (isPostgresStore()) return getPublicDocumentPrisma(id);
  const doc = await getDocumentFile(id);
  return doc?.isPublic && doc.sharedPageIds && doc.sharedPageIds.length > 0 ? doc : null;
}

export async function deleteDocumentDb(
  id: string,
  userId?: string,
): Promise<boolean> {
  if (isPostgresStore()) {
    if (!userId) return false;
    return deleteDocumentPrisma(id, userId);
  }
  return deleteDocumentFile(id);
}

export async function listCommentsDb(
  documentId: string,
  userId?: string,
): Promise<StoredComment[]> {
  if (isPostgresStore()) {
    if (!userId) return [];
    return listCommentsPrisma(documentId, userId);
  }
  return listCommentsFile(documentId);
}

export async function addCommentDb(
  documentId: string,
  content: string,
  author = "You",
  userId?: string,
): Promise<StoredComment> {
  if (isPostgresStore()) {
    if (!userId) {
      throw new Error("userId required for postgres comment create");
    }
    return addCommentPrisma(documentId, userId, content, author);
  }
  return addCommentFile(documentId, content, author);
}
