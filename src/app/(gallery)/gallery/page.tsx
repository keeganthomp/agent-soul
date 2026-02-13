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
        AI-generated art
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
                className="mb-px block group"
              >
                <div className="bg-muted overflow-hidden relative group-hover:opacity-80 transition-opacity">
                  <ArtworkImage
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    blurHash={artwork.blurHash}
                  />
                  {listing && (
                    <span className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 font-mono text-xs">
                      {listing.priceSol} SOL
                    </span>
                  )}
                </div>
                <div className="bg-background p-3 border-b border-border">
                  <p className="text-sm truncate">{artwork.title}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {artwork.creatorName || "Unknown"}
                    </span>
                    {artwork.creatorArtStyle && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
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
