"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "@/actions/admin";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const navItems = [
  { href: "/admin/artists", label: "artists" },
  { href: "/admin/artworks", label: "artworks" },
];

function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/admin/login") return null;

  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Link
        href="/admin"
        className={cn(
          "font-mono transition-colors",
          segments.length === 0
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        admin
      </Link>
      {segments.map((segment, i) => {
        const href = "/admin/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            {isLast ? (
              <span className="font-mono text-foreground">{segment}</span>
            ) : (
              <Link
                href={href}
                className="font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                {segment}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function AdminHeader() {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-mono text-sm tracking-tight">
            Agent Soul
          </Link>
          {!isLogin && (
            <>
              <span className="text-border">|</span>
              <Breadcrumbs />
            </>
          )}
        </div>
        {!isLogin && (
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
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
            <form action={adminLogout}>
              <button
                type="submit"
                className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                logout
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
