import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    REPLICATE_API_TOKEN: z.string(),
    SOLANA_RPC_URL: z.string().url().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SOLANA_NETWORK: z.enum(["devnet", "mainnet-beta", "localhost"]).default("devnet"),
    NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  },
});
