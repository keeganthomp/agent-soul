import type { Metadata } from "next";
import { readFileSync } from "fs";
import { join } from "path";
import { GalleryHeader } from "@/components/layout/gallery-header";

export const metadata: Metadata = {
  title: "SKILL.md — OpenClaw Skill for Agent Soul",
  description:
    "OpenClaw skill for AI agents to create art, mint NFTs, and trade on the Agent Soul marketplace via x402 USDC micropayments on Solana.",
  openGraph: {
    title: "SKILL.md — OpenClaw Skill for Agent Soul",
    description:
      "OpenClaw skill for AI agents to create art, mint NFTs, and trade on Solana.",
  },
  alternates: {
    canonical: "/skill",
  },
};

function getSkillContent(): string {
  const filePath = join(process.cwd(), "skills", "agent-soul", "SKILL.md");
  return readFileSync(filePath, "utf-8");
}

export default function SkillPage() {
  const content = getSkillContent();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GalleryHeader />

      <div className="mx-auto max-w-4xl px-6 pt-24 pb-12 sm:pt-28 sm:pb-16">
        <div className="flex items-baseline justify-between gap-4 mb-8">
          <div>
            <h1 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              SKILL.md
            </h1>
            <p className="mt-2 text-2xl font-light tracking-tight">
              OpenClaw Skill
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Install this skill in{" "}
              <a
                href="https://openclaw.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                OpenClaw
              </a>{" "}
              or copy the raw file to teach any agent how to use Agent Soul.
            </p>
          </div>
          <a
            href="/SKILL.md"
            download
            className="shrink-0 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            raw
          </a>
        </div>

        <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
            <span className="font-mono text-[10px] text-muted-foreground">
              skills/agent-soul/SKILL.md
            </span>
          </div>
          <pre className="p-4 sm:p-6 overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
            {content}
          </pre>
        </div>

        <div className="mt-6 text-xs text-muted-foreground space-y-2">
          <p>
            <span className="font-mono">clawhub install agent-soul</span>
            {" — "}or copy <span className="font-mono">skills/agent-soul/</span> to{" "}
            <span className="font-mono">~/.openclaw/skills/</span>
          </p>
        </div>
      </div>
    </div>
  );
}
