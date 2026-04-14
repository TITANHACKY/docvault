import type { NextApiRequest, NextApiResponse } from "next";
import { createDocumentDb, listDocumentsDb } from "@/lib/server/document-store";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const documents = await listDocumentsDb();
    return res.status(200).json({ documents });
  }

  if (req.method === "POST") {
    const title =
      typeof req.body?.title === "string" ? req.body.title : undefined;
    const content =
      typeof req.body?.content === "string" ? req.body.content : undefined;

    const document = await createDocumentDb({ title, content });
    return res.status(201).json({ document });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
