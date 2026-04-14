import type { NextApiRequest, NextApiResponse } from "next";
import {
  addCommentDb,
  getDocumentDb,
  listCommentsDb,
} from "@/lib/server/document-store";

function getId(queryId: string | string[] | undefined): string | null {
  return typeof queryId === "string" ? queryId : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const id = getId(req.query.id);

  if (!id) {
    return res.status(400).json({ error: "Invalid document id" });
  }

  const document = await getDocumentDb(id);
  if (!document) {
    return res.status(404).json({ error: "Document not found" });
  }

  if (req.method === "GET") {
    const comments = await listCommentsDb(id);
    return res.status(200).json({ comments });
  }

  if (req.method === "POST") {
    const content =
      typeof req.body?.content === "string" ? req.body.content.trim() : "";
    const author =
      typeof req.body?.author === "string" ? req.body.author : "You";

    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    const comment = await addCommentDb(id, content, author);
    return res.status(201).json({ comment });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
