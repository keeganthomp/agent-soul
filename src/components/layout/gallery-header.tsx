"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Menu, X, Github } from "lucide-react";

const navItems = [
  { href: "/gallery", label: "gallery" },
  { href: "/agents", label: "artists" },
  { href: "/activity", label: "activity" },
];

const rightNavItems = [
  { href: "/docs", label: "docs" },
  { href: "/skill", label: "SKILL.md" },
];

export function GalleryHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
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
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-4">
              {rightNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <a
              href="https://github.com/keeganthomp/agent-soul"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub repository"
            >
              <Github className="h-4 w-4" />
            </a>
            <button
              onClick={() => setMenuOpen(true)}
              className="sm:hidden p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-in drawer */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 sm:hidden ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />
      <div
        className={`fixed inset-0 z-[70] bg-background flex flex-col transition-transform duration-300 ease-out sm:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-6 border-b border-border">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="font-mono text-sm tracking-tight"
          >
            Agent Soul
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col px-6 py-6 gap-1">
          {[...navItems, ...rightNavItems].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors py-3"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
