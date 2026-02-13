import { describe, test, expect, afterAll } from "bun:test";
import { POST } from "@/app/api/auth/verify/route";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { cleanupTestUsers } from "../helpers/db";
import { makeRequest } from "../helpers/request";

const userIds: string[] = [];

afterAll(async () => {
  await cleanupTestUsers(userIds);
});

// Helper: get a fresh keypair + wallet address
function freshWallet() {
  const kp = nacl.sign.keyPair();
  return { kp, walletAddress: bs58.encode(kp.publicKey) };
}

// Helper: sign a message with a keypair
function sign(message: string, secretKey: Uint8Array) {
  return bs58.encode(
    nacl.sign.detached(new TextEncoder().encode(message), secretKey)
  );
}

describe("Auth Verify — Nonce", () => {
  test("returns nonce for valid wallet address", async () => {
    const { walletAddress } = freshWallet();

    const res = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: { action: "nonce", walletAddress },
      }) as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.nonce).toBeDefined();
    expect(data.nonce).toContain(walletAddress);
  });

  test("rejects missing wallet address", async () => {
    const res = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: { action: "nonce" },
      }) as any
    );

    expect(res.status).toBe(400);
  });
});

describe("Auth Verify — Signature Verification", () => {
  test("verifies valid agent signature and returns token + userId", async () => {
    const { kp, walletAddress } = freshWallet();

    // Get nonce
    const nonceRes = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: { action: "nonce", walletAddress },
      }) as any
    );
    const { nonce } = await nonceRes.json();

    // Verify
    const res = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: {
          action: "verify",
          walletAddress,
          signature: sign(nonce, kp.secretKey),
          message: nonce,
          accountType: "agent",
        },
      }) as any
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.userId).toBeDefined();
    userIds.push(data.userId);
  });

  test("rejects invalid signature", async () => {
    const { walletAddress } = freshWallet();

    const nonceRes = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: { action: "nonce", walletAddress },
      }) as any
    );
    const { nonce } = await nonceRes.json();

    // Sign with a DIFFERENT key
    const wrongKp = nacl.sign.keyPair();

    const res = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: {
          action: "verify",
          walletAddress,
          signature: sign(nonce, wrongKp.secretKey),
          message: nonce,
          accountType: "agent",
        },
      }) as any
    );

    expect(res.status).toBe(401);
  });

  test("rejects missing fields", async () => {
    const res = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: { action: "verify", walletAddress: "test" },
      }) as any
    );

    expect(res.status).toBe(400);
  });

  test("rejects reused nonce (nonce consumed after first verify)", async () => {
    const { kp, walletAddress } = freshWallet();

    const nonceRes = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: { action: "nonce", walletAddress },
      }) as any
    );
    const { nonce } = await nonceRes.json();

    const signature = sign(nonce, kp.secretKey);

    // First verify — succeeds
    const res1 = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: {
          action: "verify",
          walletAddress,
          signature,
          message: nonce,
          accountType: "agent",
        },
      }) as any
    );
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    userIds.push(data1.userId);

    // Second verify — fails (nonce consumed)
    const res2 = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: {
          action: "verify",
          walletAddress,
          signature,
          message: nonce,
          accountType: "agent",
        },
      }) as any
    );
    expect(res2.status).toBe(401);
  });
});

describe("Auth Verify — Invalid Action", () => {
  test("rejects unknown action", async () => {
    const res = await POST(
      makeRequest("/api/auth/verify", {
        method: "POST",
        body: { action: "invalid" },
      }) as any
    );

    expect(res.status).toBe(400);
  });
});
