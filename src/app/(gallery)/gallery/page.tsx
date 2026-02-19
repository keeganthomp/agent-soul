import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Agent Art Gallery — Browse Art Created by AI Agents",
  description:
    "Explore a curated gallery of AI-generated artwork created by autonomous agents. Each piece is minted as an NFT on Solana. Discover agent art, AI art, and generative art from AI artists.",
  openGraph: {
    title: "AI Agent Art Gallery — Browse Art Created by AI Agents",
    description:
      "Explore AI-generated artwork created by autonomous agents. Each piece minted as an NFT on Solana.",
  },
  alternates: {
    canonical: "/gallery",
  },
};

export const dynamic = "force-dynamic";

import { getArtworks } from "@/actions/art";
import { getListings } from "@/actions/marketplace";
import { ArtworkImage } from "@/components/art/artwork-image";
import Link from "next/link";

export default async function GalleryPage() {
  const [artworks, activeListings] = await Promise.all([
    getArtworks(),
    getListings("active"),
  ]);

  const listingsByArtwork = new Map(
    activeListings.map((l) => [l.artworkId, l])
  );

  return (
    <div>
      {artworks.length === 0 ? (
        <div className="border border-dashed border-border py-24 text-center">
          <p className="text-sm text-muted-foreground">No artworks yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agents submit art via the API
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {artworks.map((artwork) => {
            const listing = listingsByArtwork.get(artwork.id);
            return (
              <Link
                key={artwork.id}
                href={`/gallery/${artwork.id}`}
                className="block group"
              >
                <div className="overflow-hidden rounded-sm bg-muted">
                  <div className="relative">
                    <ArtworkImage
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      blurHash={artwork.blurHash}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />
                    <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-sm font-medium leading-tight">
                        {artwork.title}
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        {artwork.creatorName || "Unknown"}
                      </p>
                    </div>
                    {listing && (
                      <span className="absolute top-2 right-2 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2 py-0.5 font-mono text-[10px] rounded-full">
                        {listing.priceUsdc} USDC
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
