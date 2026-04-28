import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/server/prisma";
import { requireAuth } from "@/lib/server/auth";
import type { StoredPage } from "@/lib/documents-types";

// One-time backfill: copies Document.pages (Json) → Page rows + sharedPageIds → SharedPage rows.
// Safe to run multiple times — skips docs already backfilled.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const documents = await prisma.document.findMany({
    where: { ownerId: user.id },
    select: { id: true, pages: true, activePageId: true, sharedPageIds: true },
  });

  let pagesCreated = 0;
  let sharedCreated = 0;
  let docsSkipped = 0;

  for (const doc of documents) {
    // Skip if already backfilled
    const existing = await prisma.page.count({ where: { documentId: doc.id } });
    if (existing > 0) { docsSkipped++; continue; }

    const rawPages = Array.isArray(doc.pages) ? (doc.pages as unknown as StoredPage[]) : [];
    if (rawPages.length === 0) { docsSkipped++; continue; }

    // Insert Page rows
    await prisma.page.createMany({
      data: rawPages.map((p, i) => ({
        id: p.id,
        documentId: doc.id,
        title: p.title ?? "Untitled",
        content: p.content ?? "<p></p>",
        position: i,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      })),
      skipDuplicates: true,
    });
    pagesCreated += rawPages.length;

    // Insert SharedPage rows from sharedPageIds array
    const sharedIds: string[] = Array.isArray(doc.sharedPageIds) ? doc.sharedPageIds : [];
    const validSharedIds = sharedIds.filter((sid) => rawPages.some((p) => p.id === sid));
    if (validSharedIds.length > 0) {
      await prisma.sharedPage.createMany({
        data: validSharedIds.map((pageId) => ({ documentId: doc.id, pageId })),
        skipDuplicates: true,
      });
      sharedCreated += validSharedIds.length;
    }
  }

  return res.status(200).json({
    ok: true,
    docsProcessed: documents.length - docsSkipped,
    docsSkipped,
    pagesCreated,
    sharedCreated,
  });
}
