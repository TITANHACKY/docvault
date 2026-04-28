import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/server/prisma";
import { requireAuth } from "@/lib/server/auth";

// Deploy 3b: backfill is now a no-op for new columns since Page/SharedPage tables
// are the source of truth. This endpoint remains for any stragglers.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  // Link any comments that still have no pageId by assigning to doc's activePageId
  const documents = await prisma.document.findMany({
    where: { ownerId: user.id },
    select: { id: true, activePageId: true },
  });

  let commentsLinked = 0;

  for (const doc of documents) {
    const unlinked = await prisma.comment.findMany({
      where: { page: { documentId: doc.id }, pageId: { not: undefined } },
      select: { id: true },
    });

    if (unlinked.length > 0) {
      await prisma.comment.updateMany({
        where: { id: { in: unlinked.map((c) => c.id) } },
        data: { pageId: doc.activePageId },
      });
      commentsLinked += unlinked.length;
    }
  }

  return res.status(200).json({ ok: true, commentsLinked });
}
