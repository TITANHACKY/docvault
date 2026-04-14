import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/server/prisma";
import { createSession, hashPassword } from "@/lib/server/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : null;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email is already registered" });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });

  await createSession(res, user.id);

  return res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}
