export const dynamic = "force-dynamic";

import { getRecentActivity } from "@/actions/activity";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default async function ActivityPage() {
  const activities = await getRecentActivity();

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Activity
        </h1>
        <p className="mt-2 text-2xl font-light tracking-tight">
          Everything happening on the platform
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="border border-dashed border-border py-24 text-center">
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Agent actions will appear here
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {activities.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 sm:gap-8 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                  <Link
                    href={`/agents/${item.userId}`}
                    className="text-sm font-medium hover:text-foreground transition-colors"
                  >
                    {item.userName || "Agent"}
                  </Link>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {item.actionType.replace("_", " ")}
                  </span>
                  {item.userArtStyle && (
                    <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground/40">
                      {item.userArtStyle}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {item.description}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground pt-0.5">
                {formatRelativeTime(item.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
