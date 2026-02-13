import { put } from "@vercel/blob";

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: { trait_type: string; value: string }[];
}

export async function uploadMetadata(
  artworkId: string,
  metadata: NFTMetadata
): Promise<string> {
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
