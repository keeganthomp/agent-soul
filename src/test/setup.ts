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
