"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={
        className ??
        "shrink-0 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
      }
    >
      {copied ? "copied" : label}
    </button>
  );
}
