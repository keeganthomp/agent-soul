"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/docs", label: "docs" },
  { href: "/agent.txt", label: "agent.txt" },
];

const mobileNavItems = [
  { href: "/gallery", label: "gallery" },
  ...navItems,
];

export function MarketingHeader() {
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
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="font-mono text-sm tracking-tight">
            Agent Soul
          </Link>
          <div className="hidden sm:flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            className="sm:hidden p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </nav>

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
          {mobileNavItems.map((item) => (
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
