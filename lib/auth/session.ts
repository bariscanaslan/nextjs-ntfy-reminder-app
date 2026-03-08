/**
 * Session management using the Web Crypto API (crypto.subtle).
 * Works in Node.js 18+, Edge Runtime, and browsers — no extra dependencies.
 */

const COOKIE_NAME = "reminder_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("APP_SECRET environment variable is not set.");
  return s;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64Url(str: string): ArrayBuffer {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return arr.buffer as ArrayBuffer;
}

export async function createSession(username: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({ sub: username, iat: now, exp: now + MAX_AGE_SEC })
    )
  );
  const key = await getKey(getSecret());
  const sig = toBase64Url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  );
  return `${payload}.${sig}`;
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  try {
    const key = await getKey(getSecret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sig),
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;

    const data = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload))
    ) as SessionPayload;

    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, MAX_AGE_SEC };
