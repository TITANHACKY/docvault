import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/server/prisma";

function extractMentionedPageIds(content: string): Set<string> {
  const ids = new Set<string>();
  const re = /href="\/docs\/[^/]+\/([^"?]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) ids.add(decodeURIComponent(m[1]));
  return ids;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = typeof req.query.id === "string" ? req.query.id : null;
  if (!id) return res.status(400).json({ error: "Invalid document id" });

  const doc = await prisma.document.findFirst({
    where: { id, docPages: { some: { isShared: true } } },
    select: {
      id: true,
      activePageId: true,
      docPages: {
        select: { id: true, title: true, content: true, position: true, isShared: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!doc) return res.status(404).json({ error: "Not found" });

  const sharedPages = doc.docPages.filter((p) => p.isShared);
  if (sharedPages.length === 0) return res.status(404).json({ error: "Not found" });

  // Collect allowed ids: shared pages + pages mentioned in their content
  const allowedIds = new Set(sharedPages.map((p) => p.id));
  for (const page of sharedPages) {
    for (const mentionedId of extractMentionedPageIds(page.content)) {
      if (doc.docPages.some((p) => p.id === mentionedId)) allowedIds.add(mentionedId);
    }
  }

  const pages = doc.docPages.filter((p) => allowedIds.has(p.id));
  const activePageId = allowedIds.has(doc.activePageId) ? doc.activePageId : sharedPages[0].id;

  return res.status(200).json({
    id: doc.id,
    sharedPageIds: sharedPages.map((p) => p.id),
    pages,
    activePageId,
  });
}
