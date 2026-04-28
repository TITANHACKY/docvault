import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/server/prisma";
import { requireAuth } from "@/lib/server/auth";
import type { StoredPage } from "@/lib/documents-types";

// Idempotent backfill — safe to run multiple times at any deploy stage.
// Phase 1: Document.pages Json → Page rows + sharedPageIds → SharedPage rows
// Phase 2: Document.sharedPageIds → Page.isShared
// Phase 3: Comment.documentId + Document.activePageId → Comment.pageId
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
  let pagesSkipped = 0;
  let sharedMarked = 0;
  let commentsLinked = 0;

  for (const doc of documents) {
    const rawPages = Array.isArray(doc.pages) ? (doc.pages as unknown as StoredPage[]) : [];
    const sharedIds: string[] = Array.isArray(doc.sharedPageIds) ? doc.sharedPageIds : [];

    // ── Phase 1: backfill Page rows from legacy Json ──────────────
    const existingCount = await prisma.page.count({ where: { documentId: doc.id } });
    if (existingCount === 0 && rawPages.length > 0) {
      await prisma.page.createMany({
        data: rawPages.map((p, i) => ({
          id: p.id,
          documentId: doc.id,
          title: p.title ?? "Untitled",
          content: p.content ?? "<p></p>",
          position: i,
          isShared: sharedIds.includes(p.id),
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        })),
        skipDuplicates: true,
      });
      pagesCreated += rawPages.length;
    } else {
      pagesSkipped++;
    }

    // ── Phase 2: sync Page.isShared from Document.sharedPageIds ───
    if (sharedIds.length > 0) {
      // Mark shared pages as isShared = true
      const marked = await prisma.page.updateMany({
        where: { documentId: doc.id, id: { in: sharedIds }, isShared: false },
        data: { isShared: true },
      });
      sharedMarked += marked.count;
    }

    // ── Phase 3: link Comment.pageId from Document.activePageId ───
    const unlinkedComments = await prisma.comment.findMany({
      where: { documentId: doc.id, pageId: null },
      select: { id: true },
    });

    if (unlinkedComments.length > 0) {
      // Best guess: assign to activePageId if it exists as a Page row, else first page
      const targetPage = await prisma.page.findFirst({
        where: { documentId: doc.id, id: doc.activePageId },
        select: { id: true },
      }) ?? await prisma.page.findFirst({
        where: { documentId: doc.id },
        orderBy: { position: "asc" },
        select: { id: true },
      });

      if (targetPage) {
        await prisma.comment.updateMany({
          where: { id: { in: unlinkedComments.map((c) => c.id) } },
          data: { pageId: targetPage.id },
        });
        commentsLinked += unlinkedComments.length;
      }
    }
  }

  return res.status(200).json({
    ok: true,
    docsProcessed: documents.length,
    pagesCreated,
    pagesSkipped,
    sharedMarked,
    commentsLinked,
  });
}
