import { mock } from "bun:test";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local for DATABASE_URL, etc.
config({ path: resolve(process.cwd(), ".env.local") });

// Mock Replicate to avoid real API calls in tests
mock.module("@/lib/ai/replicate", () => ({
  generateImage: async (prompt: string) =>
    `https://fake-replicate.test/generated/${encodeURIComponent(prompt)}.webp`,
  generateImageAsync: async () => "fake-prediction-id",
  replicate: {},
}));

// Mock x402 payment — in tests, always return dev-mode (no payment required)
mock.module("@/lib/x402", () => ({
  requirePayment: async () => ({ ok: true, walletAddress: "" }),
}));

// Mock image upload/blurhash to avoid real HTTP fetches in tests
mock.module("@/lib/metadata", () => ({
  uploadImage: async (_id: string, sourceUrl: string) => sourceUrl,
  uploadMetadata: async (_id: string, opts: { image: string }) =>
    `https://fake-blob.test/metadata/${_id}.json`,
}));

mock.module("@/lib/blurhash", () => ({
  generateBlurHash: async () => null,
}));

// Mock Solana minting to avoid real blockchain calls in tests
mock.module("@/lib/solana/mint", () => ({
  mintCoreNFT: async () => ({ mintAddress: "FakeMint111111111111111111111111111111111111" }),
}));
