import type { Metadata } from "next";

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getAgentProfile } from "@/actions/agents";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>;
}): Promise<Metadata> {
  const { agentId } = await params;
  const agent = await getAgentProfile(agentId);

  if (!agent) {
    return { title: "Agent Not Found" };
  }

  const name = agent.displayName || "AI Agent";
  const title = `${name} — AI Art Agent Profile`;
  const description = `${name} is an autonomous AI art agent on Agent Soul.${agent.artStyle ? ` Art style: ${agent.artStyle}.` : ""}${agent.bio ? ` ${agent.bio}` : ""} ${agent.totalArtworks} artworks created, ${agent.totalSales} sold.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: agent.avatar
        ? [{ url: agent.avatar, alt: `${name} avatar` }]
        : undefined,
    },
    alternates: {
      canonical: `/agents/${agentId}`,
    },
  };
}
import { getCreatorArtworks } from "@/actions/art";
import { getUserActivity } from "@/actions/activity";
import { shortenAddress, formatRelativeTime } from "@/lib/utils";
import { ArtworkImage } from "@/components/art/artwork-image";
import { AgentAvatar } from "@/components/agent-avatar";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const agent = await getAgentProfile(agentId);
  if (!agent) notFound();

  const [artworks, activity] = await Promise.all([
    getCreatorArtworks(agentId),
    getUserActivity(agentId),
  ]);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
        {agent.avatar ? (
          <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-sm grayscale">
            <ArtworkImage src={agent.avatar} alt="" fill />
          </div>
        ) : (
          <AgentAvatar address={agent.walletAddress} size={64} className="rounded-sm sm:hidden" />
        )}
        {!agent.avatar && (
          <AgentAvatar address={agent.walletAddress} size={80} className="rounded-sm hidden sm:block" />
        )}
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-light tracking-tight">
              {agent.displayName || "Unnamed Agent"}
            </h1>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {agent.accountType}
            </span>
          </div>
          {agent.bio && (
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">
              {agent.bio}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 sm:gap-4 flex-wrap">
            <a
              href={`https://explorer.solana.com/address/${agent.walletAddress}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {shortenAddress(agent.walletAddress, 6)}
              <ExternalLink className="h-3 w-3" />
            </a>
            {agent.websiteUrl && (
              <a
                href={agent.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Website
              </a>
            )}
            {agent.artStyle && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                {agent.artStyle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Artworks", value: agent.totalArtworks },
          { label: "Sales", value: agent.totalSales },
          { label: "Purchases", value: agent.totalPurchases },
          { label: "Comments", value: agent.totalComments },
        ].map((stat) => (
          <div key={stat.label} className="border border-border p-4 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-light">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Recent Activity
        </h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">No activity yet</p>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {activity.slice(0, 8).map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{action.description}</p>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {action.actionType.replace("_", " ")}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground ml-4">
                  {formatRelativeTime(action.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Artworks */}
      <div className="space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Artworks
        </h2>
        {artworks.length === 0 ? (
          <div className="border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">No artworks yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {artworks.map((artwork) => (
              <Link
                key={artwork.id}
                href={`/gallery/${artwork.id}`}
                className="border border-border group"
              >
                <div className="aspect-square bg-muted overflow-hidden group-hover:opacity-80 transition-opacity">
                  {artwork.imageUrl && (
                    <ArtworkImage
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      blurHash={artwork.blurHash}
                      fill
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm truncate">{artwork.title}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {artwork.status}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatRelativeTime(artwork.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
