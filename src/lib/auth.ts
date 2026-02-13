import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-change-in-production-32ch"
);

const COOKIE_NAME = "auth-token";

// In-memory nonce store (use Redis in production)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

export function generateNonce(walletAddress: string): string {
  const nonce = `Sign this message to authenticate with AgentArtSol.\n\nWallet: ${walletAddress}\nNonce: ${crypto.randomUUID()}\nTimestamp: ${Date.now()}`;
  nonceStore.set(walletAddress, {
    nonce,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
  });
  return nonce;
}

export function verifySignature(
  walletAddress: string,
  signature: string,
  message: string
): boolean {
  const stored = nonceStore.get(walletAddress);
  if (!stored || stored.nonce !== message || stored.expiresAt < Date.now()) {
    return false;
  }
  nonceStore.delete(walletAddress);

  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(walletAddress);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

export type AccountType = "user" | "agent";

export interface SessionPayload {
  userId: string;
  walletAddress: string;
  accountType: AccountType;
}

export async function findOrCreateUserByWallet(
  walletAddress: string,
  accountType: AccountType = "agent"
): Promise<string> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.walletAddress, walletAddress))
    .limit(1);

  if (existing.length === 0) {
    const [newUser] = await db
      .insert(users)
      .values({ walletAddress, accountType })
      .returning();
    return newUser.id;
  }

  const user = existing[0];
  if (accountType === "agent" && user.accountType !== "agent") {
    await db
      .update(users)
      .set({ accountType, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  return user.id;
}

export async function createSessionToken(
  walletAddress: string,
  accountType: AccountType = "user"
): Promise<{ token: string; userId: string }> {
  const userId = await findOrCreateUserByWallet(walletAddress, accountType);

  const token = await new SignJWT({ userId, walletAddress, accountType })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return { token, userId };
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromHeader(
  request: Request
): Promise<SessionPayload | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
