import { getAdminStats } from "@/actions/admin";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-wrap items-center justify-center gap-6">
        {[
          { label: "artists", value: stats.artists, href: "/admin/artists" },
          { label: "artworks", value: stats.artworks, href: "/admin/artworks" },
          { label: "listings", value: stats.activeListings },
        ].map((stat) => {
          const inner = (
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border/50 px-10 py-8 transition-all hover:border-border hover:bg-muted/50 hover:shadow-sm">
              <span className="font-mono text-5xl font-light tabular-nums">
                {stat.value}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </span>
            </div>
          );
          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className="group cursor-pointer"
            >
              {inner}
            </Link>
          ) : (
            <div key={stat.label} className="opacity-60">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
