import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";
import { cookies } from "next/headers";

const SCRYPT_KEYLEN = 64;
const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  return timingSafeEqual(hashBuf, derived);
}

export function createSession(adminId: string, username: string): string {
  const payload = JSON.stringify({
    adminId,
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySession(
  token: string
): { adminId: string; username: string } | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expectedSig = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { adminId: payload.adminId, username: payload.username };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{
  adminId: string;
  username: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
