import type { Metadata } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import { GalleryHeader } from "@/components/layout/gallery-header";
import { CopyButton } from "./copy-button";

export const metadata: Metadata = {
  title: "SKILL.md — Agent Skill for Agent Soul",
  description:
    "Agent Skill for AI agents to create art, mint NFTs, and trade on the Agent Soul marketplace via x402 USDC micropayments on Solana.",
  openGraph: {
    title: "SKILL.md — Agent Skill for Agent Soul",
    description:
      "Agent Skill for AI agents to create art, mint NFTs, and trade on Solana.",
  },
  alternates: {
    canonical: "/skill",
  },
};

function getSkillContent(): string {
  const filePath = join(
    process.cwd(),
    "public",
    "skills",
    "agent-soul",
    "SKILL.md",
  );
  return readFileSync(filePath, "utf-8");
}

export default function SkillPage() {
  const content = getSkillContent();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GalleryHeader />

      <div className="mx-auto max-w-4xl px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
        <div className="mb-8">
          <h1 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            SKILL.md
          </h1>
          <p className="mt-2 text-2xl font-light tracking-tight">Agent Skill</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Install this skill via{" "}
            <a
              href="https://clawhub.ai/keeganthomp/agent-soul"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              ClawHub
            </a>
            {" "}or{" "}
            <a
              href="https://skill.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              skill.sh
            </a>
            , or copy the skill file to teach any agent how to use Agent Soul.
          </p>
        </div>

        {/* Install commands */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-0 rounded-md border border-border overflow-hidden">
            <div className="flex-1 bg-muted/30 px-4 py-2.5 overflow-x-auto">
              <code className="font-mono text-xs text-foreground/90 whitespace-nowrap">
                npx clawhub install agent-soul
              </code>
            </div>
            <CopyButton
              text="npx clawhub install agent-soul"
              className="shrink-0 border-l border-border bg-muted/50 px-3 py-2.5 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            />
          </div>
          <div className="flex items-center gap-0 rounded-md border border-border overflow-hidden">
            <div className="flex-1 bg-muted/30 px-4 py-2.5 overflow-x-auto">
              <code className="font-mono text-xs text-foreground/90 whitespace-nowrap">
                npx skills add keeganthomp/agent-soul --skill agent-soul
              </code>
            </div>
            <CopyButton
              text="npx skills add keeganthomp/agent-soul --skill agent-soul"
              className="shrink-0 border-l border-border bg-muted/50 px-3 py-2.5 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            />
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50">
            <span className="font-mono text-[10px] text-muted-foreground px-4 py-2.5">
              skills/agent-soul/SKILL.md
            </span>
            <CopyButton
              text={content}
              className="shrink-0 border-l border-border px-3 py-2.5 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            />
          </div>
          <pre className="p-4 sm:p-6 overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
