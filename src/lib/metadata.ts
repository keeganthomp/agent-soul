import { put } from "@vercel/blob";
import { db } from "@/db";
import { artworks } from "@/db/schema/artworks";
import { eq } from "drizzle-orm";

interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url?: string;
  seller_fee_basis_points: number;
  attributes?: { trait_type: string; value: string }[];
  properties: {
    creators: { address: string; share: number }[];
    files: { uri: string; type: string }[];
    category: string;
  };
}

/**
 * Re-host an image to Vercel Blob for a permanent public URL.
 * Falls back to the source URL when BLOB_READ_WRITE_TOKEN is not configured.
 */
export async function uploadImage(
  artworkId: string,
  sourceUrl: string
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      "BLOB_READ_WRITE_TOKEN not set — image will remain at source URL, which may not be permanent"
    );
    return sourceUrl;
  }

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    console.warn(`Failed to fetch image from ${sourceUrl}, using source URL`);
    return sourceUrl;
  }

  const contentType = res.headers.get("content-type") || "image/png";
  const ext = contentType.includes("jpeg") || contentType.includes("jpg")
    ? "jpg"
    : contentType.includes("webp")
      ? "webp"
      : "png";

  const blob = await put(`images/${artworkId}.${ext}`, res.body!, {
    contentType,
    access: "public",
  });

  return blob.url;
}

/**
 * Build full Metaplex-standard metadata JSON and upload to Vercel Blob.
 * Falls back to DB storage + local API endpoint when Blob is not configured.
 */
export async function uploadMetadata(
  artworkId: string,
  opts: {
    name: string;
    description: string;
    image: string;
    creatorWallet: string;
    attributes?: { trait_type: string; value: string }[];
  }
): Promise<string> {
  const symbol = process.env.NFT_SYMBOL || "AART";
  const sellerFeeBasisPoints = parseInt(
    process.env.ROYALTY_BASIS_POINTS || "500",
    10
  );
  const externalUrl = process.env.NEXT_PUBLIC_APP_URL;

  const imageContentType = opts.image.includes(".jpg") || opts.image.includes(".jpeg")
    ? "image/jpeg"
    : opts.image.includes(".webp")
      ? "image/webp"
      : "image/png";

  const metadata: NFTMetadata = {
    name: opts.name,
    symbol,
    description: opts.description,
    image: opts.image,
    ...(externalUrl && { external_url: externalUrl }),
    seller_fee_basis_points: sellerFeeBasisPoints,
    attributes: opts.attributes,
    properties: {
      creators: [{ address: opts.creatorWallet, share: 100 }],
      files: [{ uri: opts.image, type: imageContentType }],
      category: "image",
    },
  };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(
      `metadata/${artworkId}.json`,
      JSON.stringify(metadata),
      {
        contentType: "application/json",
        access: "public",
      }
    );
    return blob.url;
  }

  // Fallback: store metadata JSON in the artwork row and serve via API
  console.warn(
    "BLOB_READ_WRITE_TOKEN not set — metadata stored locally. NFTs will not display correctly in explorers."
  );
  await db
    .update(artworks)
    .set({ metadataJson: JSON.stringify(metadata) })
    .where(eq(artworks.id, artworkId));

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/v1/artworks/${artworkId}/metadata`;
}
