import type { NextApiRequest, NextApiResponse } from "next";
import {
  deleteDocumentDb,
  getDocumentDb,
  upsertDocumentDb,
} from "@/lib/server/document-store";
import type { StoredDocument, StoredPage } from "@/lib/documents-types";
import { requireAuth } from "@/lib/server/auth";

function getId(queryId: string | string[] | undefined): string | null {
  return typeof queryId === "string" ? queryId : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const id = getId(req.query.id);

  if (!id) {
    return res.status(400).json({ error: "Invalid document id" });
  }

  if (req.method === "GET") {
    const document = await getDocumentDb(id, user.id);
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (document.ownerId && document.ownerId !== user.id) {
      return res.status(404).json({ error: "Document not found" });
    }
    return res.status(200).json({ document });
  }

  if (req.method === "PUT") {
    const current = await getDocumentDb(id, user.id);
    const now = Date.now();

    const payload = req.body as Partial<StoredDocument>;
    const nextPages = Array.isArray(payload?.pages)
      ? payload.pages.filter((page): page is StoredPage => {
          return (
            typeof page?.id === "string" &&
            typeof page?.title === "string" &&
            typeof page?.content === "string" &&
            typeof page?.createdAt === "number" &&
            typeof page?.updatedAt === "number"
          );
        })
      : (current?.pages ?? []);

    const fallbackPage: StoredPage = {
      id: current?.activePageId ?? id,
      title:
        typeof payload?.title === "string"
          ? payload.title
          : (current?.title ?? "Untitled"),
      content:
        typeof payload?.content === "string"
          ? payload.content
          : (current?.content ?? "<p></p>"),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };

    const pages = nextPages.length > 0 ? nextPages : [fallbackPage];
    const activePageId =
      typeof payload?.activePageId === "string" &&
      pages.some((page) => page.id === payload.activePageId)
        ? payload.activePageId
        : (current?.activePageId ?? pages[0].id);

    const activePage =
      pages.find((page) => page.id === activePageId) ?? pages[0];

    const next: StoredDocument = {
      id,
      title:
        typeof payload?.title === "string"
          ? payload.title
          : (activePage?.title ?? current?.title ?? "Untitled"),
      content:
        typeof payload?.content === "string"
          ? payload.content
          : (activePage?.content ?? current?.content ?? "<p></p>"),
      pages,
      activePageId,
      ownerId: current?.ownerId ?? user.id,
      createdAt:
        typeof payload?.createdAt === "number"
          ? payload.createdAt
          : (current?.createdAt ?? now),
      updatedAt:
        typeof payload?.updatedAt === "number" ? payload.updatedAt : now,
    };

    const document = await upsertDocumentDb(next, user.id);
    return res.status(200).json({ document });
  }

  if (req.method === "DELETE") {
    const deleted = await deleteDocumentDb(id, user.id);
    if (!deleted) return res.status(404).json({ error: "Document not found" });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed" });
}
