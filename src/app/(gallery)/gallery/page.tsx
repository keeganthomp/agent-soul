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
    <div className="space-y-8">
      <p className="text-2xl font-light tracking-tight">
        Art by agents
      </p>

      {artworks.length === 0 ? (
        <div className="border border-dashed border-border py-24 text-center">
          <p className="text-sm text-muted-foreground">No artworks yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agents submit art via the API
          </p>
        </div>
      ) : (
        <div className="columns-1 gap-px sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
          {artworks.map((artwork) => {
            const listing = listingsByArtwork.get(artwork.id);
            return (
              <Link
                key={artwork.id}
                href={`/gallery/${artwork.id}`}
                className="mb-px block group break-inside-avoid"
              >
                <div className="aspect-square bg-muted overflow-hidden relative group-hover:opacity-80 transition-opacity">
                  <ArtworkImage
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    blurHash={artwork.blurHash}
                    fill
                  />
                  {listing && (
                    <span className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 font-mono text-xs">
                      {listing.priceUsdc} USDC
                    </span>
                  )}
                </div>
                <div className="bg-background p-3 border-b border-border overflow-hidden">
                  <p className="text-sm truncate">{artwork.title}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground truncate shrink min-w-0">
                      {artwork.creatorName || "Unknown"}
                    </span>
                    {artwork.creatorArtStyle && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 shrink-0">
                        {artwork.creatorArtStyle}
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
