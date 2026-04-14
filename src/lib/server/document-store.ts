import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  StoredComment,
  StoredDocument,
  StoredPage,
} from "@/lib/documents-types";

interface StoredDatabase {
  documents: StoredDocument[];
  commentsByDocumentId: Record<string, StoredComment[]>;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "doc-editor-db.json");

function defaultDb(): StoredDatabase {
  return {
    documents: [],
    commentsByDocumentId: {},
  };
}

function createDefaultPage(now: number): StoredPage {
  return {
    id: randomUUID(),
    title: "Untitled",
    content: "<p></p>",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeDocument(input: Partial<StoredDocument>): StoredDocument {
  const now = Date.now();

  const pages = Array.isArray(input.pages)
    ? input.pages
        .filter((page): page is StoredPage => {
          return (
            typeof page?.id === "string" &&
            typeof page?.title === "string" &&
            typeof page?.content === "string" &&
            typeof page?.createdAt === "number" &&
            typeof page?.updatedAt === "number"
          );
        })
        .map((page) => ({ ...page }))
    : [];

  if (pages.length === 0) {
    const migratedPage: StoredPage = {
      id: randomUUID(),
      title:
        typeof input.title === "string" && input.title.trim()
          ? input.title
          : "Untitled",
      content: typeof input.content === "string" ? input.content : "<p></p>",
      createdAt: typeof input.createdAt === "number" ? input.createdAt : now,
      updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : now,
    };
    pages.push(migratedPage);
  }

  const activePageId =
    typeof input.activePageId === "string" &&
    pages.some((page) => page.id === input.activePageId)
      ? input.activePageId
      : pages[0].id;

  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];

  return {
    id:
      typeof input.id === "string" && input.id.length > 0
        ? input.id
        : randomUUID(),
    title:
      typeof input.title === "string" && input.title.trim()
        ? input.title
        : activePage.title || "Untitled",
    content:
      typeof input.content === "string" ? input.content : activePage.content,
    pages,
    activePageId,
    createdAt: typeof input.createdAt === "number" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : now,
  };
}

async function ensureDbFile() {
  await mkdir(DB_DIR, { recursive: true });

  try {
    await readFile(DB_PATH, "utf-8");
  } catch {
    await writeFile(DB_PATH, JSON.stringify(defaultDb(), null, 2), "utf-8");
  }
}

async function readDb(): Promise<StoredDatabase> {
  await ensureDbFile();

  try {
    const raw = await readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoredDatabase>;
    const documents = Array.isArray(parsed.documents)
      ? (parsed.documents as unknown[])
          .filter(
            (doc): doc is Partial<StoredDocument> =>
              typeof doc === "object" && doc !== null,
          )
          .map((doc) => normalizeDocument(doc))
      : [];

    return {
      documents,
      commentsByDocumentId: parsed.commentsByDocumentId ?? {},
    };
  } catch {
    return defaultDb();
  }
}

async function writeDb(db: StoredDatabase) {
  await ensureDbFile();
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function listDocumentsDb(): Promise<StoredDocument[]> {
  const db = await readDb();
  return [...db.documents].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDocumentDb(
  id: string,
): Promise<StoredDocument | null> {
  const db = await readDb();
  return db.documents.find((doc) => doc.id === id) ?? null;
}

export async function createDocumentDb(input?: {
  title?: string;
  content?: string;
}): Promise<StoredDocument> {
  const db = await readDb();
  const now = Date.now();
  const firstPage = createDefaultPage(now);
  const title = input?.title?.trim() || "Untitled";
  const content = input?.content || "<p></p>";

  firstPage.title = title;
  firstPage.content = content;

  const document: StoredDocument = {
    id: randomUUID(),
    title,
    content,
    pages: [firstPage],
    activePageId: firstPage.id,
    createdAt: now,
    updatedAt: now,
  };

  db.documents.push(document);
  await writeDb(db);
  return document;
}

export async function upsertDocumentDb(
  document: StoredDocument,
): Promise<StoredDocument> {
  const db = await readDb();
  const normalizedDocument = normalizeDocument(document);
  const index = db.documents.findIndex(
    (doc) => doc.id === normalizedDocument.id,
  );

  if (index === -1) {
    db.documents.push(normalizedDocument);
  } else {
    db.documents[index] = normalizedDocument;
  }

  await writeDb(db);
  return normalizedDocument;
}

export async function deleteDocumentDb(id: string): Promise<boolean> {
  const db = await readDb();
  const previousLength = db.documents.length;
  db.documents = db.documents.filter((doc) => doc.id !== id);
  delete db.commentsByDocumentId[id];

  await writeDb(db);
  return db.documents.length !== previousLength;
}

export async function listCommentsDb(
  documentId: string,
): Promise<StoredComment[]> {
  const db = await readDb();
  return [...(db.commentsByDocumentId[documentId] ?? [])].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
}

export async function addCommentDb(
  documentId: string,
  content: string,
  author = "You",
): Promise<StoredComment> {
  const db = await readDb();

  const comment: StoredComment = {
    id: randomUUID(),
    documentId,
    content: content.trim(),
    author,
    createdAt: Date.now(),
  };

  const comments = db.commentsByDocumentId[documentId] ?? [];
  comments.push(comment);
  db.commentsByDocumentId[documentId] = comments;

  await writeDb(db);
  return comment;
}
