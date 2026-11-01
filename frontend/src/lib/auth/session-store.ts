// frontend/src/lib/auth/session-store.ts
// SERVER ONLY — never import from client-side code

export interface MagazynSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

const ENC_KEY_ENV = "SESSION_ENCRYPTION_KEY";

async function getKey(): Promise<CryptoKey> {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.SESSION_ENCRYPTION_KEY
      : undefined) || (typeof process !== "undefined" ? process.env[ENC_KEY_ENV] : undefined);
  if (!raw || raw.length < 64) {
    throw new Error(`${ENC_KEY_ENV} must be a 64-char hex string (32 bytes)`);
  }
  const bytes = Buffer.from(raw, "hex");
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptSession(session: MagazynSession): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(session));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const encode = (buf: ArrayBuffer | Uint8Array) =>
    Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString("base64url");
  return `${encode(iv)}:${encode(ciphertext)}`;
}

export async function decryptSession(cookie: string): Promise<MagazynSession | null> {
  try {
    const [ivB64, ctB64] = cookie.split(":");
    if (!ivB64 || !ctB64) return null;
    const key = await getKey();
    const iv = Buffer.from(ivB64, "base64url");
    const ct = Buffer.from(ctB64, "base64url");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(plain)) as MagazynSession;
  } catch {
    return null; // tampered, corrupt, or wrong key
  }
}

export const SESSION_COOKIE = "magazyn_sid";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  // Safe in both Astro SSR (import.meta.env defined) and plain Node contexts
  // (e.g. Playwright fixtures) where import.meta.env is undefined.
  secure: typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.PROD : false,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days (matches Supabase refresh token lifetime)
} as const;
