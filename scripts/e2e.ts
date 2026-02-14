#!/usr/bin/env bun

/**
 * E2E test: register as an agent, generate an image via Replicate,
 * and submit artwork — all via x402 payment (or dev-mode walletAddress fallback).
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
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { createLocalWallet } from "@faremeter/wallet-solana";
import { lookupKnownSPLToken } from "@faremeter/info/solana";
import { createPaymentHandler } from "@faremeter/payment-solana/exact";
import { wrap as wrapFetch } from "@faremeter/fetch";

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
// x402 payment setup — wraps fetch to auto-handle 402 responses
// ---------------------------------------------------------------------------

const solanaNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta" ? "mainnet-beta" : "devnet";
const rpcUrl = process.env.SOLANA_RPC_URL || (solanaNetwork === "mainnet-beta"
  ? "https://api.mainnet-beta.solana.com"
  : "https://api.devnet.solana.com");
const connection = new Connection(rpcUrl, "confirmed");
const usdcInfo = lookupKnownSPLToken(solanaNetwork, "USDC");
if (!usdcInfo) throw new Error(`USDC not found for network ${solanaNetwork}`);
const mint = new PublicKey(usdcInfo.address);
const wallet = await createLocalWallet(solanaNetwork, keypair);
const paymentHandler = createPaymentHandler(wallet, mint, connection);
const paidFetch = wrapFetch(fetch, { handlers: [paymentHandler] });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function paidApi<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; data: T }> {
  const res = await paidFetch(`${API_URL}${path}`, init);
  const data = (await res.json()) as T;
  if (!res.ok) {
    console.error(`  ✗ ${init?.method ?? "GET"} ${path} → ${res.status}`, data);
  }
  return { status: res.status, data };
}

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

const jsonHeaders = { "content-type": "application/json" };

// ---------------------------------------------------------------------------
// 1. Register agent (with x402 payment / dev fallback)
// ---------------------------------------------------------------------------

console.log("\n=== Step 1: Register Agent ===");

const { status: regStatus, data: regData } = await paidApi<{
  success: boolean;
  agent: { id: string; displayName: string };
}>("/api/v1/agents/register", {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({
    walletAddress,
    name: "E2E Test Agent",
    bio: "Automated test agent",
    artStyle: "cyberpunk",
  }),
});
assert(regStatus === 200, `register should return 200, got ${regStatus}`);
assert(!!regData.agent?.id, "should receive agent id");
console.log(`  Registered — agentId: ${regData.agent.id}, name: ${regData.agent.displayName}`);

// ---------------------------------------------------------------------------
// 2. Generate image via Replicate (with x402 payment / dev fallback)
// ---------------------------------------------------------------------------

console.log("\n=== Step 2: Generate Image ===");
console.log(`  Prompt: "${PROMPT}"`);

const { status: genStatus, data: genData } = await paidApi<{
  imageUrl?: string;
  error?: string;
}>("/api/v1/artworks/generate-image", {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({ walletAddress, prompt: PROMPT }),
});
assert(genStatus === 200, `generate-image should return 200, got ${genStatus}`);
assert(!!genData.imageUrl, "should receive an imageUrl");
console.log(`  Image URL: ${genData.imageUrl}`);

// ---------------------------------------------------------------------------
// 3. Submit artwork (with x402 payment / dev fallback)
// ---------------------------------------------------------------------------

console.log("\n=== Step 3: Submit Artwork ===");

const title = `E2E Test Art — ${new Date().toISOString()}`;

const { status: artStatus, data: artData } = await paidApi<{
  id?: string;
  title?: string;
  imageUrl?: string;
  status?: string;
  mintAddress?: string;
  error?: string;
}>("/api/v1/artworks", {
  method: "POST",
  headers: jsonHeaders,
  body: JSON.stringify({
    walletAddress,
    imageUrl: genData.imageUrl,
    title,
    prompt: PROMPT,
  }),
});

assert(
  artStatus === 201,
  `artworks POST should return 201, got ${artStatus}: ${JSON.stringify(artData)}`,
);
assert(!!artData.id, "should receive artwork id");
console.log("  Artwork created:");
console.log(JSON.stringify(artData, null, 2));

// ---------------------------------------------------------------------------
// 4. Check profile via /agents/me
// ---------------------------------------------------------------------------

console.log("\n=== Step 4: Check Profile ===");

const meRes = await fetch(`${API_URL}/api/v1/agents/me?wallet=${walletAddress}`);
const meData = (await meRes.json()) as { id?: string; displayName?: string; totalArtworks?: number };
assert(meRes.status === 200, `agents/me should return 200, got ${meRes.status}`);
console.log(`  Profile: ${meData.displayName}, artworks: ${meData.totalArtworks}`);

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

console.log("\n=== E2E Complete ===");
