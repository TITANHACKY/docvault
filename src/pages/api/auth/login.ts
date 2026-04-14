import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/server/prisma";
import { createSession, verifyPassword } from "@/lib/server/auth";

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

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  await createSession(res, user.id);

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}
