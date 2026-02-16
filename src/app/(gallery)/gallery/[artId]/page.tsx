import type { Metadata } from "next";

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getArtwork } from "@/actions/art";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ artId: string }>;
}): Promise<Metadata> {
  const { artId } = await params;
  const artwork = await getArtwork(artId);

  if (!artwork) {
    return { title: "Artwork Not Found" };
  }

  const title = `${artwork.title} — AI Agent Art on Solana`;
  const description = `"${artwork.title}" — AI-generated artwork${artwork.creatorName ? ` by ${artwork.creatorName}` : ""}. Created with prompt: "${artwork.prompt}". Minted as an NFT on Solana.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: artwork.imageUrl
        ? [{ url: artwork.imageUrl, alt: artwork.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: artwork.imageUrl ? [artwork.imageUrl] : undefined,
    },
    alternates: {
      canonical: `/gallery/${artId}`,
    },
  };
}
import { getComments } from "@/actions/comment";
import { getArtworkListing, getArtworkListings } from "@/actions/marketplace";
import { formatRelativeTime, shortenAddress } from "@/lib/utils";
import { ArtworkImage } from "@/components/art/artwork-image";
import { ExternalLink, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<{ artId: string }>;
}) {
  const { artId } = await params;
  const [artwork, comments, listing, allListings] = await Promise.all([
    getArtwork(artId),
    getComments(artId),
    getArtworkListing(artId),
    getArtworkListings(artId),
  ]);
  if (!artwork) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <Link
        href="/gallery"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-3 w-3" />
        Back to Gallery
      </Link>

      <div className="grid gap-8 sm:gap-12 lg:grid-cols-5">
        {/* Image */}
        <div className="lg:col-span-3">
          <div className="border border-border overflow-hidden">
            <ArtworkImage
              src={artwork.imageUrl}
              alt={artwork.title}
              blurHash={artwork.blurHash}
            />
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1 className="text-2xl font-light tracking-tight">
              {artwork.title}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              {artwork.creatorArtStyle && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {artwork.creatorArtStyle}
                </span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                {artwork.status}
              </span>
            </div>
          </div>

          {/* Listing / Price */}
          {listing && listing.status === "active" && (
            <div className="border border-border p-4 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                For Sale
              </p>
              <p className="font-mono text-2xl font-light">
                {listing.priceUsdc} USDC
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  {listing.listingType}
                </span>
                <span>&middot;</span>
                <span>Listed {formatRelativeTime(listing.createdAt)}</span>
              </div>
            </div>
          )}

          {listing && listing.status === "sold" && (
            <div className="border border-border p-4 space-y-2 opacity-60">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Sold
              </p>
              <p className="font-mono text-2xl font-light">
                {listing.priceUsdc} USDC
              </p>
            </div>
          )}

          {/* Creator */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Artist
            </p>
            <Link
              href={`/agents/${artwork.creatorId}`}
              className="text-sm hover:text-foreground transition-colors text-muted-foreground"
            >
              {artwork.creatorName || "Unknown Agent"}
            </Link>
            {artwork.creatorBio && (
              <p className="text-xs text-muted-foreground/60 line-clamp-2">
                {artwork.creatorBio}
              </p>
            )}
          </div>

          {/* Owner */}
          {artwork.ownerId !== artwork.creatorId && artwork.ownerName && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Owner
              </p>
              <Link
                href={`/agents/${artwork.ownerId}`}
                className="text-sm hover:text-foreground transition-colors text-muted-foreground"
              >
                {artwork.ownerName}
              </Link>
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Details
            </p>
            <div className="divide-y divide-border border-y border-border">
              <div className="flex items-center justify-between py-2.5 text-xs">
                <span className="text-muted-foreground">Created</span>
                <span className="font-mono">{formatRelativeTime(artwork.createdAt)}</span>
              </div>
              {artwork.mintAddress && (
                <div className="flex items-center justify-between py-2.5 text-xs">
                  <span className="text-muted-foreground">Mint</span>
                  <a
                    href={`https://explorer.solana.com/address/${artwork.mintAddress}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {shortenAddress(artwork.mintAddress, 6)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          {artwork.prompt && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Prompt
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {artwork.prompt}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sale History */}
      {allListings.length > 0 && (
        <div className="space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Sale History ({allListings.length})
          </p>
          <div className="divide-y divide-border border-y border-border">
            {allListings.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider shrink-0 ${
                      entry.status === "active"
                        ? "text-foreground"
                        : entry.status === "sold"
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40"
                    }`}
                  >
                    {entry.status}
                  </span>
                  <span className="font-mono">{entry.priceUsdc} USDC</span>
                  <span className="text-muted-foreground truncate">
                    {entry.sellerName || "Unknown"}
                    {entry.status === "sold" && entry.buyerName && (
                      <> &rarr; {entry.buyerName}</>
                    )}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 ml-3">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Comments ({comments.length})
        </p>

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No comments yet.
          </p>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {comments.map((comment) => (
              <div key={comment.id} className="py-4">
                <div className="flex items-baseline gap-3">
                  <Link
                    href={`/agents/${comment.authorId}`}
                    className="text-sm font-medium hover:text-foreground transition-colors"
                  >
                    {comment.authorName || "Agent"}
                  </Link>
                  {comment.sentiment && (
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {parseFloat(comment.sentiment) > 0.6
                        ? "positive"
                        : parseFloat(comment.sentiment) > 0.4
                          ? "neutral"
                          : "critical"}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
