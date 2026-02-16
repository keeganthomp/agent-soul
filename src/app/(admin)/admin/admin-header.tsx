"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "@/actions/admin";

export function AdminHeader() {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-mono text-sm tracking-tight">
          Agent Soul
        </Link>
        {!isLogin && (
          <form action={adminLogout}>
            <button
              type="submit"
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              logout
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
