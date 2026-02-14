#!/usr/bin/env bun

/**
 * One-time setup script: creates a Metaplex Core collection NFT.
 *
 * Prerequisites:
 *   - MINT_AUTHORITY_SECRET_KEY in .env.local
 *   - BLOB_READ_WRITE_TOKEN in .env.local (for hosting collection metadata)
 *
 * Usage:
 *   bun run create-collection
 *
 * After running, copy the printed COLLECTION_MINT_ADDRESS into .env.local.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { put } from "@vercel/blob";
import { createPlatformCollection } from "../src/lib/solana/mint";

const COLLECTION_NAME = "AgentArtSol";
const COLLECTION_SYMBOL = process.env.NFT_SYMBOL || "AART";
const COLLECTION_DESCRIPTION =
  "AI-generated art created by autonomous agents on the AgentArtSol platform.";

async function main() {
  if (!process.env.MINT_AUTHORITY_SECRET_KEY) {
    console.error("Error: MINT_AUTHORITY_SECRET_KEY is not set in .env.local");
    process.exit(1);
  }

  // Build collection metadata JSON
  const sellerFeeBasisPoints = parseInt(
    process.env.ROYALTY_BASIS_POINTS || "500",
    10
  );

  const metadata = {
    name: COLLECTION_NAME,
    symbol: COLLECTION_SYMBOL,
    description: COLLECTION_DESCRIPTION,
    image: "", // Will be updated if an image is provided
    seller_fee_basis_points: sellerFeeBasisPoints,
    ...(process.env.NEXT_PUBLIC_APP_URL && {
      external_url: process.env.NEXT_PUBLIC_APP_URL,
    }),
    properties: {
      category: "image",
      creators: [],
      files: [],
    },
  };

  // Upload metadata
  let metadataUri: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("Uploading collection metadata to Vercel Blob...");
    const blob = await put(
      "metadata/collection.json",
      JSON.stringify(metadata),
      {
        contentType: "application/json",
        access: "public",
      }
    );
    metadataUri = blob.url;
    console.log(`  Metadata URI: ${metadataUri}`);
  } else {
    console.error(
      "Error: BLOB_READ_WRITE_TOKEN is required to host collection metadata."
    );
    console.error(
      "Get a token from Vercel dashboard → Storage → Blob → Connect."
    );
    process.exit(1);
  }

  // Mint collection NFT
  console.log("Minting collection NFT on-chain...");
  const { collectionAddress } = await createPlatformCollection({
    name: COLLECTION_NAME,
    uri: metadataUri,
  });

  console.log("\nCollection created successfully!");
  console.log(`\nAdd this to your .env.local:\n`);
  console.log(`COLLECTION_MINT_ADDRESS=${collectionAddress}`);
}

main().catch((err) => {
  console.error("Failed to create collection:", err);
  process.exit(1);
});
