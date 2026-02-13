#!/usr/bin/env bun

/**
 * E2E test: authenticate as an agent via Solana wallet signature,
 * generate an image via Replicate, and submit artwork.
 *
 * Usage:
 *   SOLANA_PRIVATE_KEY=<base58-secret-key> bun run scripts/e2e.ts
 *
 * Env vars:
 *   SOLANA_PRIVATE_KEY  — base58-encoded Solana keypair secret key (required)
 *   API_URL             — base URL of the running app (default: http://localhost:3000)
 *   PROMPT              — image generation prompt (default provided)
 */

import { config } from "dotenv";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

config({ path: ".env.local" });

const API_URL = (process.env.API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const PROMPT =
  process.env.PROMPT ||
  "A cyberpunk robot painting a sunset on a neon canvas, digital art";

// ---------------------------------------------------------------------------
// Wallet setup
// ---------------------------------------------------------------------------

const secretKey = process.env.SOLANA_PRIVATE_KEY;
if (!secretKey) {
  throw new Error(
    "Missing SOLANA_PRIVATE_KEY env var (base58-encoded secret key).",
  );
}

const keypair = Keypair.fromSecretKey(bs58.decode(secretKey));
const walletAddress = keypair.publicKey.toBase58();
console.log(`Wallet: ${walletAddress}`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API_URL}${path}`, init);
  const data = (await res.json()) as T;
  if (!res.ok) {
    console.error(`  ✗ ${init?.method ?? "GET"} ${path} → ${res.status}`, data);
  }
  return { status: res.status, data };
}

function sign(message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const sig = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(sig);
}

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ---------------------------------------------------------------------------
// 1. Authenticate — get nonce, sign it, exchange for JWT
// ---------------------------------------------------------------------------

console.log("\n=== Step 1: Authenticate ===");

const { data: nonceData } = await api<{ nonce: string }>("/api/auth/verify", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ action: "nonce", walletAddress }),
});
assert(!!nonceData.nonce, "should receive a nonce");
console.log(`  Nonce received (${nonceData.nonce.length} chars)`);

const signature = sign(nonceData.nonce);

const { status: verifyStatus, data: verifyData } = await api<{
  success: boolean;
  token: string;
  userId: string;
}>("/api/auth/verify", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    action: "verify",
    walletAddress,
    signature,
    message: nonceData.nonce,
    accountType: "agent",
  }),
});
assert(verifyStatus === 200, `verify should return 200, got ${verifyStatus}`);
assert(!!verifyData.token, "should receive a JWT token");
console.log(`  Authenticated — userId: ${verifyData.userId}`);

const authHeaders = {
  "content-type": "application/json",
  authorization: `Bearer ${verifyData.token}`,
};

// ---------------------------------------------------------------------------
// 2. Generate image via Replicate
// ---------------------------------------------------------------------------

console.log("\n=== Step 2: Generate Image ===");
console.log(`  Prompt: "${PROMPT}"`);

const { status: genStatus, data: genData } = await api<{
  imageUrl?: string;
  error?: string;
}>("/api/v1/artworks/generate-image", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ prompt: PROMPT }),
});
assert(genStatus === 200, `generate-image should return 200, got ${genStatus}`);
assert(!!genData.imageUrl, "should receive an imageUrl");
console.log(`  Image URL: ${genData.imageUrl}`);

// ---------------------------------------------------------------------------
// 3. Submit artwork
// ---------------------------------------------------------------------------

console.log("\n=== Step 3: Submit Artwork ===");

const title = `E2E Test Art — ${new Date().toISOString()}`;

const { status: artStatus, data: artData } = await api<{
  id?: string;
  title?: string;
  imageUrl?: string;
  error?: string;
}>("/api/v1/artworks", {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    imageUrl: genData.imageUrl,
    title,
    prompt: PROMPT,
  }),
});

// The artworks POST may require x402 payment — if so, 402 is expected
if (artStatus === 402) {
  console.log(
    "  Artwork submission returned 402 (x402 payment required) — skipping.",
  );
  console.log(
    "  To test artwork submission, configure FACILITATOR_URL and MERCHANT_SOLANA_ADDRESS.",
  );
} else {
  assert(
    artStatus === 201,
    `artworks POST should return 201, got ${artStatus}`,
  );
  assert(!!artData.id, "should receive artwork id");
  console.log("  Artwork created:");
  console.log(JSON.stringify(artData, null, 2));
}

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

console.log("\n=== E2E Complete ===");
