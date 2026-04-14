import type { StoredComment, StoredDocument } from "@/lib/documents-types";

const DOCS_KEY = "doc-editor:guest:documents:v1";
const COMMENTS_KEY = "doc-editor:guest:comments:v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readDocuments(): StoredDocument[] {
  return readJson<StoredDocument[]>(DOCS_KEY, []);
}

function writeDocuments(documents: StoredDocument[]): void {
  writeJson(DOCS_KEY, documents);
}

function readComments(): Record<string, StoredComment[]> {
  return readJson<Record<string, StoredComment[]>>(COMMENTS_KEY, {});
}

function writeComments(
  commentsByDocumentId: Record<string, StoredComment[]>,
): void {
  writeJson(COMMENTS_KEY, commentsByDocumentId);
}

export async function listGuestDocuments(): Promise<StoredDocument[]> {
  return [...readDocuments()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getGuestDocument(
  id: string,
): Promise<StoredDocument | null> {
  const docs = readDocuments();
  return docs.find((doc) => doc.id === id) ?? null;
}

export async function createGuestDocument(input?: {
  id?: string;
  title?: string;
  content?: string;
}): Promise<StoredDocument> {
  const now = Date.now();
  const pageId = crypto.randomUUID();
  const title = input?.title?.trim() || "Untitled";
  const content = input?.content || "<p></p>";

  const document: StoredDocument = {
    id: input?.id || crypto.randomUUID(),
    title,
    content,
    pages: [
      {
        id: pageId,
        title,
        content,
        createdAt: now,
        updatedAt: now,
      },
    ],
    activePageId: pageId,
    createdAt: now,
    updatedAt: now,
  };

  const docs = readDocuments();
  docs.push(document);
  writeDocuments(docs);
  return document;
}

export async function upsertGuestDocument(
  document: StoredDocument,
): Promise<StoredDocument> {
  const docs = readDocuments();
  const index = docs.findIndex((doc) => doc.id === document.id);

  if (index === -1) {
    docs.push(document);
  } else {
    docs[index] = document;
  }

  writeDocuments(docs);
  return document;
}

export async function deleteGuestDocument(id: string): Promise<void> {
  const docs = readDocuments().filter((doc) => doc.id !== id);
  writeDocuments(docs);

  const comments = readComments();
  delete comments[id];
  writeComments(comments);
}

export async function listGuestComments(
  documentId: string,
): Promise<StoredComment[]> {
  const comments = readComments();
  return [...(comments[documentId] ?? [])].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
}

export async function addGuestComment(
  documentId: string,
  content: string,
  author = "Guest",
): Promise<StoredComment> {
  const commentsByDocumentId = readComments();
  const current = commentsByDocumentId[documentId] ?? [];

  const comment: StoredComment = {
    id: crypto.randomUUID(),
    documentId,
    content: content.trim(),
    author,
    createdAt: Date.now(),
  };

  current.push(comment);
  commentsByDocumentId[documentId] = current;
  writeComments(commentsByDocumentId);

  return comment;
}
