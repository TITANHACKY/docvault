export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

async function requestJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me");
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error("Failed to fetch current user");
  }

  const payload = (await response.json()) as { user: AuthUser };
  return payload.user;
}

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthUser> {
  const payload = await requestJson<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.user;
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const payload = await requestJson<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.user;
}

export async function logoutUser(): Promise<void> {
  await requestJson<{ ok: true }>("/api/auth/logout", { method: "POST" });
}
