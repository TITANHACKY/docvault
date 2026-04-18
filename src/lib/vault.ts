/**
 * Vault v2 — client-side AES-GCM encrypted password store.
 *
 * Key architecture:
 *  - A random 256-bit `vaultKey` encrypts the vault entries.
 *  - The `vaultKey` is "wrapped" (encrypted) once per unlock method:
 *      PIN:       AES-GCM(vaultKey, PBKDF2(pin, salt))
 *      Biometric: AES-GCM(vaultKey, HKDF(WebAuthn-PRF-output, prfSalt))
 *  - Either method can independently unlock the vault.
 *
 * Storage:
 *  - Server (PostgreSQL) via /api/vault for authenticated users.
 *  - localStorage as fallback / guest cache.
 */

const STORAGE_KEY = "vault_v2";
const PBKDF2_ITERATIONS = 310_000;
const APP_NAME = "doc-vault";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VaultEntry {
  id: string;
  site: string;
  url?: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface WrappedKey {
  iv: string;
  wrappedKey: string;
}

export interface VaultBlob {
  version: 2;
  ciphertext: string;
  iv: string;
  pin?: WrappedKey & { salt: string };
  biometric?: WrappedKey & {
    credentialId: string;
    prfSalt: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes));
}

function fromb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function rand(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

async function derivePinKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function derivePrfKey(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", prfOutput, "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode(`${APP_NAME}-biometric-wrap`),
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function wrapVaultKey(
  vaultKeyRaw: Uint8Array,
  wrapKey: CryptoKey,
): Promise<WrappedKey> {
  const iv = rand(12);
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    vaultKeyRaw,
  );
  return { iv: b64(iv), wrappedKey: b64(wrapped) };
}

async function unwrapVaultKey(
  w: WrappedKey,
  wrapKey: CryptoKey,
): Promise<Uint8Array | null> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromb64(w.iv) },
      wrapKey,
      fromb64(w.wrappedKey),
    );
    return new Uint8Array(plain);
  } catch {
    return null;
  }
}

async function encryptData(
  data: unknown,
  keyRaw: Uint8Array,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = rand(12);
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return { ciphertext: b64(cipher), iv: b64(iv) };
}

async function decryptData(
  ciphertext: string,
  iv: string,
  keyRaw: Uint8Array,
): Promise<VaultEntry[] | null> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      keyRaw,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromb64(iv) },
      key,
      fromb64(ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plain)) as VaultEntry[];
  } catch {
    return null;
  }
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export async function loadVaultBlob(): Promise<VaultBlob | null> {
  try {
    const res = await fetch("/api/vault");
    if (res.ok) {
      const { blob } = (await res.json()) as { blob: string | null };
      if (blob) {
        const parsed = JSON.parse(blob) as VaultBlob;
        localStorage.setItem(STORAGE_KEY, blob);
        return parsed;
      }
    }
  } catch {
    // Offline or unauthenticated — fall through to localStorage
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VaultBlob;
  } catch {
    return null;
  }
}

export async function saveVaultBlob(blob: VaultBlob): Promise<void> {
  const serialised = JSON.stringify(blob);
  localStorage.setItem(STORAGE_KEY, serialised);
  try {
    await fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blob: serialised }),
    });
  } catch {
    // Offline — localStorage save is enough for now
  }
}

export function vaultExistsLocally(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

// ─── PIN unlock ──────────────────────────────────────────────────────────────

export async function createVaultWithPin(
  pin: string,
  entries: VaultEntry[],
): Promise<{ blob: VaultBlob; vaultKey: Uint8Array }> {
  const vaultKey = rand(32);
  const salt = rand(32);
  const pinKey = await derivePinKey(pin, salt);
  const pinWrap = await wrapVaultKey(vaultKey, pinKey);
  const { ciphertext, iv } = await encryptData(entries, vaultKey);
  const blob: VaultBlob = {
    version: 2,
    ciphertext,
    iv,
    pin: { salt: b64(salt), ...pinWrap },
  };
  return { blob, vaultKey };
}

export async function unlockWithPin(
  blob: VaultBlob,
  pin: string,
): Promise<{ entries: VaultEntry[]; vaultKey: Uint8Array } | null> {
  if (!blob.pin) return null;
  const pinKey = await derivePinKey(pin, fromb64(blob.pin.salt));
  const vaultKey = await unwrapVaultKey(blob.pin, pinKey);
  if (!vaultKey) return null;
  const entries = await decryptData(blob.ciphertext, blob.iv, vaultKey);
  if (!entries) return null;
  return { entries, vaultKey };
}

export async function addPinToVault(
  blob: VaultBlob,
  vaultKey: Uint8Array,
  pin: string,
): Promise<VaultBlob> {
  const salt = rand(32);
  const pinKey = await derivePinKey(pin, salt);
  const pinWrap = await wrapVaultKey(vaultKey, pinKey);
  return { ...blob, pin: { salt: b64(salt), ...pinWrap } };
}

// ─── Biometric (WebAuthn PRF) unlock ─────────────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

interface BiometricRegistration {
  credentialId: string;
  prfSalt: string;
}

export async function registerBiometric(): Promise<BiometricRegistration | null> {
  const challenge = rand(32);
  const prfSalt = rand(32);
  const userId = rand(16);

  let credential: PublicKeyCredential | null = null;
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Doc Vault", id: window.location.hostname },
        user: { id: userId, name: APP_NAME, displayName: "Vault" },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extensions: { prf: { eval: { first: prfSalt } } } as any,
      },
    })) as PublicKeyCredential | null;
  } catch {
    return null;
  }

  if (!credential) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ext = (credential as any).getClientExtensionResults?.() as any;
  if (!ext?.prf?.results?.first) return null; // PRF not supported

  return {
    credentialId: b64(new Uint8Array(credential.rawId)),
    prfSalt: b64(prfSalt),
  };
}

async function getPrfOutput(
  credentialId: string,
  prfSalt: string,
): Promise<ArrayBuffer | null> {
  const challenge = rand(32);
  let assertion: PublicKeyCredential | null = null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: fromb64(credentialId), type: "public-key" }],
        userVerification: "required",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extensions: { prf: { eval: { first: fromb64(prfSalt) } } } as any,
      },
    })) as PublicKeyCredential | null;
  } catch {
    return null;
  }
  if (!assertion) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ext = (assertion as any).getClientExtensionResults?.() as any;
  return ext?.prf?.results?.first ?? null;
}

export async function createVaultWithBiometric(entries: VaultEntry[]): Promise<{
  blob: VaultBlob;
  vaultKey: Uint8Array;
} | null> {
  const registration = await registerBiometric();
  if (!registration) return null;

  const prfOutput = await getPrfOutput(
    registration.credentialId,
    registration.prfSalt,
  );
  if (!prfOutput) return null;

  const vaultKey = rand(32);
  const prfKey = await derivePrfKey(prfOutput);
  const bioWrap = await wrapVaultKey(vaultKey, prfKey);
  const { ciphertext, iv } = await encryptData(entries, vaultKey);

  const blob: VaultBlob = {
    version: 2,
    ciphertext,
    iv,
    biometric: {
      credentialId: registration.credentialId,
      prfSalt: registration.prfSalt,
      ...bioWrap,
    },
  };
  return { blob, vaultKey };
}

export async function addBiometricToVault(
  blob: VaultBlob,
  vaultKey: Uint8Array,
): Promise<VaultBlob | null> {
  const registration = await registerBiometric();
  if (!registration) return null;

  const prfOutput = await getPrfOutput(
    registration.credentialId,
    registration.prfSalt,
  );
  if (!prfOutput) return null;

  const prfKey = await derivePrfKey(prfOutput);
  const bioWrap = await wrapVaultKey(vaultKey, prfKey);
  return {
    ...blob,
    biometric: {
      credentialId: registration.credentialId,
      prfSalt: registration.prfSalt,
      ...bioWrap,
    },
  };
}

export async function unlockWithBiometric(
  blob: VaultBlob,
): Promise<{ entries: VaultEntry[]; vaultKey: Uint8Array } | null> {
  if (!blob.biometric) return null;
  const prfOutput = await getPrfOutput(
    blob.biometric.credentialId,
    blob.biometric.prfSalt,
  );
  if (!prfOutput) return null;
  const prfKey = await derivePrfKey(prfOutput);
  const vaultKey = await unwrapVaultKey(blob.biometric, prfKey);
  if (!vaultKey) return null;
  const entries = await decryptData(blob.ciphertext, blob.iv, vaultKey);
  if (!entries) return null;
  return { entries, vaultKey };
}

// ─── Vault entry management ──────────────────────────────────────────────────

export async function updateVaultEntries(
  blob: VaultBlob,
  entries: VaultEntry[],
  vaultKey: Uint8Array,
): Promise<VaultBlob> {
  const { ciphertext, iv } = await encryptData(entries, vaultKey);
  return { ...blob, ciphertext, iv };
}

export function hasPinUnlock(blob: VaultBlob | null): boolean {
  return !!blob?.pin;
}

export function hasBiometricUnlock(blob: VaultBlob | null): boolean {
  return !!blob?.biometric;
}
