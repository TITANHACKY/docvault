import type { NextApiRequest, NextApiResponse } from "next";
import { getDocumentDb, upsertDocumentDb } from "@/lib/server/document-store";
import { requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const id = typeof req.query.id === "string" ? req.query.id : null;
  if (!id) return res.status(400).json({ error: "Invalid document id" });

  const pageId = typeof req.body?.pageId === "string" ? req.body.pageId : null;
  if (!pageId) return res.status(400).json({ error: "pageId required" });

  // Verify the page belongs to this user's document
  const page = await prisma.page.findFirst({
    where: { id: pageId, documentId: id, document: { ownerId: user.id } },
    select: { id: true, isShared: true },
  });
  if (!page) return res.status(404).json({ error: "Page not found" });

  // Toggle Page.isShared
  const updated = await prisma.page.update({
    where: { id: pageId },
    data: { isShared: !page.isShared },
    select: { id: true, isShared: true },
  });

  // Keep legacy Document.sharedPageIds in sync for rollback safety
  const doc = await getDocumentDb(id, user.id);
  if (doc) {
    const currentSet = new Set(doc.sharedPageIds ?? []);
    updated.isShared ? currentSet.add(pageId) : currentSet.delete(pageId);
    const sharedPageIds = [...currentSet];
    await upsertDocumentDb({ ...doc, sharedPageIds, isPublic: sharedPageIds.length > 0 }, user.id);
  }

  // Return all shared page ids for this document
  const sharedPages = await prisma.page.findMany({
    where: { documentId: id, isShared: true },
    select: { id: true },
  });

  return res.status(200).json({
    isPublic: sharedPages.length > 0,
    sharedPageIds: sharedPages.map((p) => p.id),
  });
}
