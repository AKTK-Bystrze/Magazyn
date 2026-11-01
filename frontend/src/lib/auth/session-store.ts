// frontend/src/lib/auth/session-store.ts
// SERVER ONLY — never import from client-side code

export interface MagazynSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

const HEX_KEY_REGEX = /^[0-9a-fA-F]{64}$/;

let cachedKey: CryptoKey | null = null;
let cachedRawKey: string | null = null;

async function getKey(): Promise<CryptoKey> {
  const raw = process.env.SESSION_ENCRYPTION_KEY ?? import.meta.env?.SESSION_ENCRYPTION_KEY;
  if (!raw || !HEX_KEY_REGEX.test(raw)) {
    cachedKey = null;
    cachedRawKey = null;
    throw new Error("SESSION_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  if (cachedKey && cachedRawKey === raw) {
    return cachedKey;
  }
  cachedRawKey = raw;
  cachedKey = await crypto.subtle.importKey(
    "raw",
    Buffer.from(raw, "hex"),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey;
}

export async function encryptSession(session: MagazynSession): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(session));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const ivB64 = Buffer.from(iv).toString("base64url");
  const ctB64 = Buffer.from(ciphertext).toString("base64url");
  return `${ivB64}:${ctB64}`;
}

export async function decryptSession(cookie: string): Promise<MagazynSession | null> {
  let key: CryptoKey;
  try {
    key = await getKey();
  } catch (err) {
    console.error("[SessionStore] Fatal session encryption key error:", err);
    return null;
  }

  try {
    const [ivB64, ctB64] = cookie.split(":");
    if (!ivB64 || !ctB64) return null;
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
  secure: Boolean(import.meta.env?.PROD || process.env.NODE_ENV === "production"),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
} as const;

/**
 * Clears all cookies received in the request along with the session cookie.
 *
 * @param request - Incoming HTTP request containing cookie headers
 * @param cookies - Cookie store capable of issuing deletion directives
 */
export function clearAllCookies(
  request: Request,
  cookies: { delete: (name: string, options?: { path?: string; domain?: string }) => void }
): void {
  const raw = request.headers.get("cookie") || "";
  const names = new Set([
    SESSION_COOKIE,
    ...raw
      .split(";")
      .map((p) => p.split("=")[0].trim())
      .filter(Boolean),
  ]);
  for (const name of names) cookies.delete(name, { path: "/" });
}
