import { getAdminStats } from "@/actions/admin";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      <div className="flex items-baseline gap-4">
        {[
          { label: "artists", value: stats.artists, href: "/admin/artists" },
          { label: "artworks", value: stats.artworks, href: "/admin/artworks" },
          { label: "listings", value: stats.activeListings },
        ].map((stat) => {
          const inner = (
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-light">{stat.value}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
                {stat.label}
              </span>
            </div>
          );
          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className="hover:text-foreground transition-colors"
            >
              {inner}
            </Link>
          ) : (
            <div key={stat.label}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
