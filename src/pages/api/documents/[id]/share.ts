import type { NextApiRequest, NextApiResponse } from "next";
import { getDocumentDb, upsertDocumentDb } from "@/lib/server/document-store";
import { requireAuth } from "@/lib/server/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const id = typeof req.query.id === "string" ? req.query.id : null;
  if (!id) return res.status(400).json({ error: "Invalid document id" });

  const doc = await getDocumentDb(id, user.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.ownerId && doc.ownerId !== user.id) return res.status(404).json({ error: "Document not found" });

  const pageId = typeof req.body?.pageId === "string" ? req.body.pageId : null;
  if (!pageId) return res.status(400).json({ error: "pageId required" });
  if (!doc.pages.some((p) => p.id === pageId)) return res.status(400).json({ error: "Page not found in document" });

  const current = new Set(doc.sharedPageIds ?? []);
  // Toggle: if already shared remove it, otherwise add it
  if (current.has(pageId)) {
    current.delete(pageId);
  } else {
    current.add(pageId);
  }

  const sharedPageIds = [...current];
  const isPublic = sharedPageIds.length > 0;

  const updated = await upsertDocumentDb({ ...doc, isPublic, sharedPageIds }, user.id);
  return res.status(200).json({
    isPublic: updated.isPublic ?? false,
    sharedPageIds: updated.sharedPageIds ?? [],
  });
}
