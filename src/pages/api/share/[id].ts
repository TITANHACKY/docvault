import type { NextApiRequest, NextApiResponse } from "next";
import { getPublicDocumentDb } from "@/lib/server/document-store";
import type { StoredPage } from "@/lib/documents-types";

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

  const doc = await getPublicDocumentDb(id);
  if (!doc || !doc.sharedPageIds?.length) return res.status(404).json({ error: "Not found" });

  const sharedSet = new Set(doc.sharedPageIds);

  // Collect all shared pages, plus any pages they mention that are also in the doc
  const allowedIds = new Set(sharedSet);
  for (const page of doc.pages) {
    if (!sharedSet.has(page.id)) continue;
    for (const mentionedId of extractMentionedPageIds(page.content)) {
      if (doc.pages.some((p) => p.id === mentionedId)) allowedIds.add(mentionedId);
    }
  }

  // Preserve original page order
  const pages: StoredPage[] = doc.pages.filter((p) => allowedIds.has(p.id));
  if (!pages.length) return res.status(404).json({ error: "Not found" });

  // Default to first shared page
  const activePageId = sharedSet.has(doc.activePageId)
    ? doc.activePageId
    : doc.sharedPageIds[0];

  return res.status(200).json({
    id: doc.id,
    sharedPageIds: doc.sharedPageIds,
    pages,
    activePageId,
  });
}
