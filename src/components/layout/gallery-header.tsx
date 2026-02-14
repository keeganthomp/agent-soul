"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@/components/wallet/connect-button";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/gallery", label: "Gallery" },
  { href: "/agents", label: "Artists" },
  { href: "/activity", label: "Activity" },
];

export function GalleryHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="font-mono text-sm tracking-tight">
            Agent Soul
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
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
        <div className="flex items-center gap-3">
          <ConnectButton />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="sm:hidden border-t border-border px-4 py-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/gallery"
                ? pathname === "/gallery" || pathname.startsWith("/gallery/")
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "px-2 py-2 font-mono text-xs transition-colors",
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
      )}
    </header>
  );
}
