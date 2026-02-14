#!/usr/bin/env bun

/**
 * E2E test using curl + raw x402 flow (no helper libs).
 *
 * Usage:
 *   SOLANA_PRIVATE_KEY=<base58-secret-key> bun run scripts/e2e-curl.ts
 *
 * Env vars:
 *   SOLANA_PRIVATE_KEY   — base58-encoded Solana keypair secret key (required)
 *   API_URL              — base URL of the running app (default: https://agentsoul.xyz)
 *   PROMPT               — image generation prompt (default provided)
 *   SOLANA_RPC_URL       — optional RPC override (defaults by network)
 *   NEXT_PUBLIC_SOLANA_NETWORK — fallback network selector (devnet/mainnet-beta)
 */

import { config } from "dotenv";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

config({ path: ".env.local" });

const API_URL = (process.env.API_URL || "https://agentsoul.xyz").replace(/\/$/, "");
const PROMPT =
  process.env.PROMPT ||
  "A cyberpunk robot painting a sunset on a neon canvas, digital art";

const secretKey = process.env.SOLANA_PRIVATE_KEY;
if (!secretKey) {
  throw new Error(
    "Missing SOLANA_PRIVATE_KEY env var (base58-encoded secret key).",
  );
}

const keypair = Keypair.fromSecretKey(bs58.decode(secretKey));
const walletAddress = keypair.publicKey.toBase58();
console.log(`Wallet: ${walletAddress}`);

const execFileAsync = promisify(execFile);

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

type X402Accept = {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  payTo: string;
  asset: string;
};

type X402Response = {
  x402Version: number;
  accepts: X402Accept[];
};

type CurlResult<T> = {
  status: number;
  data: T | null;
  raw: string;
};

async function curlJson<T>(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
): Promise<CurlResult<T>> {
  const method = options.method ?? "GET";
  const args: string[] = ["-s", "-w", "\n%{http_code}", url, "-X", method];

  const headers = options.headers ?? {};
  const body =
    typeof options.body === "undefined" ? undefined : JSON.stringify(options.body);

  if (body) {
    headers["Content-Type"] ??= "application/json";
  }

  for (const [key, value] of Object.entries(headers)) {
    args.push("-H", `${key}: ${value}`);
  }

  if (body) {
    args.push("-d", body);
  }

  const { stdout } = await execFileAsync("curl", args, {
    maxBuffer: 10 * 1024 * 1024,
  });

  const output = stdout.toString();
  const lastNewline = output.lastIndexOf("\n");
  const bodyText = lastNewline === -1 ? output : output.slice(0, lastNewline);
  const statusText = lastNewline === -1 ? "" : output.slice(lastNewline + 1);
  const status = Number.parseInt(statusText.trim(), 10);

  if (!Number.isFinite(status)) {
    throw new Error(`Unexpected curl status output: "${statusText.trim()}"`);
  }

  let data: T | null = null;
  const trimmedBody = bodyText.trim();
  if (trimmedBody) {
    try {
      data = JSON.parse(trimmedBody) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${String(error)}`);
    }
  }

  return { status, data, raw: bodyText };
}

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function networkToCluster(network?: string): "mainnet-beta" | "devnet" {
  if (network?.includes("mainnet")) return "mainnet-beta";
  if (network?.includes("devnet")) return "devnet";
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
    ? "mainnet-beta"
    : "devnet";
}

function defaultRpcUrl(cluster: "mainnet-beta" | "devnet"): string {
  return cluster === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";
}

function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return ata;
}

function createTransferIx(
  sourceAta: PublicKey,
  destinationAta: PublicKey,
  owner: PublicKey,
  amount: bigint,
): TransactionInstruction {
  const data = Buffer.alloc(9);
  data[0] = 3; // SPL Token: Transfer
  data.writeBigUInt64LE(amount, 1);
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: sourceAta, isSigner: false, isWritable: true },
      { pubkey: destinationAta, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

async function buildPaymentHeader(
  accept: X402Accept,
  x402Version: number,
): Promise<string> {
  const cluster = networkToCluster(accept.network);
  const rpcUrl = process.env.SOLANA_RPC_URL || defaultRpcUrl(cluster);
  const connection = new Connection(rpcUrl, "confirmed");

  const mint = new PublicKey(accept.asset);
  const payTo = new PublicKey(accept.payTo);
  const sourceAta = getAssociatedTokenAddress(mint, keypair.publicKey);
  const destinationAta = getAssociatedTokenAddress(mint, payTo);
  const amount = BigInt(accept.maxAmountRequired);

  const transferIx = createTransferIx(
    sourceAta,
    destinationAta,
    keypair.publicKey,
    amount,
  );

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: blockhash,
    instructions: [transferIx],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([keypair]);

  const serialized = Buffer.from(tx.serialize()).toString("base64");
  const paymentJson = {
    x402Version,
    scheme: accept.scheme,
    network: accept.network,
    payload: { transaction: serialized },
  };

  return Buffer.from(JSON.stringify(paymentJson)).toString("base64");
}

async function callWithPayment<T>(
  path: string,
  init: { method: string; body?: Record<string, unknown> },
): Promise<{ status: number; data: T | null }> {
  const url = `${API_URL}${path}`;
  const first = await curlJson<T | X402Response>(url, {
    method: init.method,
    body: init.body,
  });

  if (first.status !== 402) {
    return { status: first.status, data: first.data as T };
  }

  const paymentInfo = first.data as X402Response | null;
  if (!paymentInfo?.accepts?.length) {
    throw new Error("x402 response missing accepts array");
  }

  const accept = paymentInfo.accepts[0];
  const paymentHeader = await buildPaymentHeader(accept, paymentInfo.x402Version);
  const retry = await curlJson<T>(url, {
    method: init.method,
    headers: { "X-PAYMENT": paymentHeader },
    body: init.body,
  });

  return { status: retry.status, data: retry.data };
}

// ---------------------------------------------------------------------------
// 1. Register agent
// ---------------------------------------------------------------------------

console.log("\n=== Step 1: Register Agent ===");

const { status: regStatus, data: regData } = await callWithPayment<{
  success: boolean;
  agent: { id: string; displayName: string };
}>("/api/v1/agents/register", {
  method: "POST",
  body: {
    walletAddress,
    name: "E2E Test Agent",
    bio: "Automated test agent",
    artStyle: "cyberpunk",
  },
});

assert(regStatus === 200, `register should return 200, got ${regStatus}`);
assert(!!regData?.agent?.id, "should receive agent id");
console.log(
  `  Registered — agentId: ${regData.agent.id}, name: ${regData.agent.displayName}`,
);

// ---------------------------------------------------------------------------
// 2. Generate image via Replicate
// ---------------------------------------------------------------------------

console.log("\n=== Step 2: Generate Image ===");
console.log(`  Prompt: "${PROMPT}"`);

const { status: genStatus, data: genData } = await callWithPayment<{
  imageUrl?: string;
  error?: string;
}>("/api/v1/artworks/generate-image", {
  method: "POST",
  body: { walletAddress, prompt: PROMPT },
});

assert(genStatus === 200, `generate-image should return 200, got ${genStatus}`);
assert(!!genData?.imageUrl, "should receive an imageUrl");
console.log(`  Image URL: ${genData.imageUrl}`);

// ---------------------------------------------------------------------------
// 3. Submit artwork
// ---------------------------------------------------------------------------

console.log("\n=== Step 3: Submit Artwork ===");

const title = `E2E Test Art — ${new Date().toISOString()}`;

const { status: artStatus, data: artData } = await callWithPayment<{
  id?: string;
  title?: string;
  imageUrl?: string;
  status?: string;
  mintAddress?: string;
  error?: string;
}>("/api/v1/artworks", {
  method: "POST",
  body: {
    walletAddress,
    imageUrl: genData.imageUrl,
    title,
    prompt: PROMPT,
  },
});

assert(
  artStatus === 201,
  `artworks POST should return 201, got ${artStatus}: ${JSON.stringify(artData)}`,
);
assert(!!artData?.id, "should receive artwork id");
console.log("  Artwork created:");
console.log(JSON.stringify(artData, null, 2));

// ---------------------------------------------------------------------------
// 4. Check profile via /agents/me (public)
// ---------------------------------------------------------------------------

console.log("\n=== Step 4: Check Profile ===");

const meRes = await curlJson<{
  id?: string;
  displayName?: string;
  totalArtworks?: number;
}>(`${API_URL}/api/v1/agents/me?wallet=${walletAddress}`);

assert(meRes.status === 200, `agents/me should return 200, got ${meRes.status}`);
console.log(
  `  Profile: ${meRes.data?.displayName}, artworks: ${meRes.data?.totalArtworks}`,
);

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

console.log("\n=== E2E Complete ===");
