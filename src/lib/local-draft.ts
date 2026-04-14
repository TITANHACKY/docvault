import type { StoredPage } from "@/lib/documents-types";

export interface EditorDraftPayload {
  title: string;
  pages: StoredPage[];
  activePageId: string;
  updatedAt: number;
}

const STORAGE_PREFIX = "doc-editor:draft:v1:";
const KEY_SEED = "doc-editor-local-draft-key";

function toBase64(input: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < input.length; index += 1) {
    binary += String.fromCharCode(input[index]);
  }
  return btoa(binary);
}

function fromBase64(input: string): Uint8Array<ArrayBuffer> {
  const binary = atob(input);
  const output = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}

async function deriveKey(docId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const seed = encoder.encode(KEY_SEED);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    seed,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(`${docId}:draft-salt`),
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function getStorageKey(docId: string): string {
  return `${STORAGE_PREFIX}${docId}`;
}

export async function saveEncryptedDraft(
  docId: string,
  payload: EditorDraftPayload,
): Promise<void> {
  if (typeof window === "undefined") return;

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(docId);
  const serialized = encoder.encode(JSON.stringify(payload));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    serialized,
  );

  const encoded = `${toBase64(iv)}.${toBase64(new Uint8Array(encryptedBuffer))}`;
  window.localStorage.setItem(getStorageKey(docId), encoded);
}

export async function loadEncryptedDraft(
  docId: string,
): Promise<EditorDraftPayload | null> {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(getStorageKey(docId));
  if (!stored) return null;

  const [ivBase64, payloadBase64] = stored.split(".");
  if (!ivBase64 || !payloadBase64) return null;

  try {
    const key = await deriveKey(docId);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivBase64) },
      key,
      fromBase64(payloadBase64),
    );

    const decoder = new TextDecoder();
    const parsed = JSON.parse(
      decoder.decode(decryptedBuffer),
    ) as Partial<EditorDraftPayload>;

    if (
      typeof parsed?.title !== "string" ||
      typeof parsed?.activePageId !== "string" ||
      typeof parsed?.updatedAt !== "number" ||
      !Array.isArray(parsed?.pages)
    ) {
      return null;
    }

    return {
      title: parsed.title,
      pages: parsed.pages,
      activePageId: parsed.activePageId,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function clearEncryptedDraft(docId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getStorageKey(docId));
}
