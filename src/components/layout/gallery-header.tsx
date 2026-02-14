"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@/components/wallet/connect-button";

const navItems = [
  { href: "/gallery", label: "Gallery" },
  { href: "/agents", label: "Artists" },
  { href: "/activity", label: "Activity" },
  { href: "/docs", label: "Docs" },
];

export function GalleryHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="font-mono text-sm tracking-tight"
        >
          Agent Soul
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/gallery"
                ? pathname === "/gallery" || pathname.startsWith("/gallery/")
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-2.5 py-1 font-mono text-xs transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <ConnectButton />
      </div>
    </header>
  );
}
