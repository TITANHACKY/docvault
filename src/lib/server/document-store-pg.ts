import { randomUUID } from "node:crypto";
import type {
  StoredComment,
  StoredDocument,
  StoredPage,
} from "@/lib/documents-types";

interface PgClient {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
}

let poolPromise: Promise<PgClient> | null = null;
let schemaReadyPromise: Promise<void> | null = null;

async function getClient(): Promise<PgClient> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const { Pool } = await import("pg");
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error("DATABASE_URL is required for PostgreSQL storage");
      }

      const pool = new Pool({
        connectionString: databaseUrl,
        ssl:
          process.env.PGSSL === "true"
            ? { rejectUnauthorized: false }
            : undefined,
      });

      return pool;
    })();
  }

  return poolPromise;
}

async function ensureSchema(client: PgClient): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          pages JSONB NOT NULL,
          active_page_id TEXT NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          author TEXT NOT NULL,
          created_at BIGINT NOT NULL
        )
      `);

      await client.query(
        "CREATE INDEX IF NOT EXISTS comments_document_id_idx ON comments(document_id)",
      );
    })();
  }

  await schemaReadyPromise;
}

function normalizePages(pages: unknown): StoredPage[] {
  if (!Array.isArray(pages)) return [];

  return pages.filter((page): page is StoredPage => {
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

function mapDocument(row: Record<string, unknown>): StoredDocument {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    pages: normalizePages(row.pages),
    activePageId: String(row.active_page_id),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function mapComment(row: Record<string, unknown>): StoredComment {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    content: String(row.content),
    author: String(row.author),
    createdAt: Number(row.created_at),
  };
}

async function withPg<T>(action: (client: PgClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  await ensureSchema(client);
  return action(client);
}

export async function listDocumentsPg(): Promise<StoredDocument[]> {
  return withPg(async (client) => {
    const result = await client.query(
      "SELECT * FROM documents ORDER BY updated_at DESC",
    );
    return result.rows.map(mapDocument);
  });
}

export async function getDocumentPg(
  id: string,
): Promise<StoredDocument | null> {
  return withPg(async (client) => {
    const result = await client.query(
      "SELECT * FROM documents WHERE id = $1 LIMIT 1",
      [id],
    );

    if (result.rows.length === 0) return null;
    return mapDocument(result.rows[0]);
  });
}

export async function createDocumentPg(input?: {
  title?: string;
  content?: string;
}): Promise<StoredDocument> {
  return withPg(async (client) => {
    const now = Date.now();
    const pageId = randomUUID();
    const title = input?.title?.trim() || "Untitled";
    const content = input?.content || "<p></p>";

    const document: StoredDocument = {
      id: randomUUID(),
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

    await client.query(
      `
      INSERT INTO documents (id, title, content, pages, active_page_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
      `,
      [
        document.id,
        document.title,
        document.content,
        JSON.stringify(document.pages),
        document.activePageId,
        document.createdAt,
        document.updatedAt,
      ],
    );

    return document;
  });
}

export async function upsertDocumentPg(
  document: StoredDocument,
): Promise<StoredDocument> {
  return withPg(async (client) => {
    await client.query(
      `
      INSERT INTO documents (id, title, content, pages, active_page_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        pages = EXCLUDED.pages,
        active_page_id = EXCLUDED.active_page_id,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
      `,
      [
        document.id,
        document.title,
        document.content,
        JSON.stringify(document.pages),
        document.activePageId,
        document.createdAt,
        document.updatedAt,
      ],
    );

    return document;
  });
}

export async function deleteDocumentPg(id: string): Promise<boolean> {
  return withPg(async (client) => {
    const result = await client.query("DELETE FROM documents WHERE id = $1", [
      id,
    ]);

    const rowCount = result.rowCount ?? 0;
    return rowCount > 0;
  });
}

export async function listCommentsPg(
  documentId: string,
): Promise<StoredComment[]> {
  return withPg(async (client) => {
    const result = await client.query(
      "SELECT * FROM comments WHERE document_id = $1 ORDER BY created_at ASC",
      [documentId],
    );

    return result.rows.map(mapComment);
  });
}

export async function addCommentPg(
  documentId: string,
  content: string,
  author = "You",
): Promise<StoredComment> {
  return withPg(async (client) => {
    const comment: StoredComment = {
      id: randomUUID(),
      documentId,
      content: content.trim(),
      author,
      createdAt: Date.now(),
    };

    await client.query(
      `
      INSERT INTO comments (id, document_id, content, author, created_at)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        comment.id,
        comment.documentId,
        comment.content,
        comment.author,
        comment.createdAt,
      ],
    );

    return comment;
  });
}
