import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const record = await prisma.vaultBlob.findUnique({
      where: { userId: user.id },
    });
    return res.status(200).json({ blob: record?.blob ?? null });
  }

  if (req.method === "DELETE") {
    await prisma.vaultBlob.deleteMany({ where: { userId: user.id } });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST") {
    const blob = req.body?.blob;
    if (typeof blob !== "string") {
      return res.status(400).json({ error: "blob must be a string" });
    }
    // Reject blobs that are implausibly large (> 2 MB)
    if (blob.length > 2 * 1024 * 1024) {
      return res.status(413).json({ error: "Vault too large" });
    }
    await prisma.vaultBlob.upsert({
      where: { userId: user.id },
      create: { userId: user.id, blob },
      update: { blob },
    });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed" });
}
