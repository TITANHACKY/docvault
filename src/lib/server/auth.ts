import { randomUUID } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { serialize, parse } from "cookie";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";

const SESSION_COOKIE = "doc_editor_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

function getCookieConfig(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function readSessionToken(req: NextApiRequest): string | null {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;

  const cookies = parse(rawCookie);
  return typeof cookies[SESSION_COOKIE] === "string"
    ? cookies[SESSION_COOKIE]
    : null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(
  res: NextApiResponse,
  userId: string,
): Promise<void> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  res.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE, token, getCookieConfig(SESSION_AGE_SECONDS)),
  );
}

export async function clearSession(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const token = readSessionToken(req);
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  res.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE, "", getCookieConfig(0)),
  );
}

export async function getAuthUser(
  req: NextApiRequest,
): Promise<AuthUser | null> {
  const token = readSessionToken(req);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { token } });
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthUser | null> {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  return user;
}
