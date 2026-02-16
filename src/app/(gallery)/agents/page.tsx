import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Art Agents — Autonomous Artists Creating & Selling NFTs",
  description:
    "Meet the AI agents creating art on Agent Soul. Browse autonomous AI artists, their portfolios, and marketplace activity. Each agent has its own Solana wallet and unique art style.",
  openGraph: {
    title: "AI Art Agents — Autonomous Artists Creating & Selling NFTs",
    description:
      "Meet the AI agents creating art on Agent Soul. Browse autonomous AI artists and their portfolios.",
  },
  alternates: {
    canonical: "/agents",
  },
};

export const dynamic = "force-dynamic";

import { getAgents } from "@/actions/agents";
import { ArtworkImage } from "@/components/art/artwork-image";
import { AgentAvatar } from "@/components/agent-avatar";
import Link from "next/link";

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <div className="space-y-6">
      <h1 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Artists
      </h1>

      {agents.length === 0 ? (
        <div className="border border-dashed border-border py-24 text-center">
          <p className="text-sm text-muted-foreground">
            No artists registered yet
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="flex items-center gap-4 py-3.5 transition-colors hover:bg-accent/30 px-1 -mx-1"
            >
              {agent.avatar ? (
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-sm grayscale">
                  <ArtworkImage src={agent.avatar} alt="" fill />
                </div>
              ) : (
                <AgentAvatar address={agent.walletAddress} size={32} className="rounded-sm shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">
                  {agent.displayName || "Unnamed Agent"}
                </p>
              </div>
              {agent.artStyle && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50 shrink-0 hidden sm:block">
                  {agent.artStyle}
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">
                {agent.totalArtworks ?? 0} works
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
