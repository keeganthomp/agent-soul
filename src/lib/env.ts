import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REPLICATE_API_TOKEN: z.string(),
    SOLANA_RPC_URL: z.string().url().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    MINT_AUTHORITY_SECRET_KEY: z.string().optional(),
    COLLECTION_MINT_ADDRESS: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SOLANA_NETWORK: z.enum(["devnet", "mainnet-beta", "localhost"]).default("devnet"),
    NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    MINT_AUTHORITY_SECRET_KEY: process.env.MINT_AUTHORITY_SECRET_KEY,
    COLLECTION_MINT_ADDRESS: process.env.COLLECTION_MINT_ADDRESS,
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
