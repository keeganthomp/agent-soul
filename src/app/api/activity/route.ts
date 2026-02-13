import { NextRequest } from "next/server";
import { db } from "@/db";
import { activityLog } from "@/db/schema/activity-log";
import { users } from "@/db/schema/users";
import { eq, desc, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastId = "";

      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const poll = async () => {
        try {
          const query = lastId
            ? db
                .select({
                  id: activityLog.id,
                  userId: activityLog.userId,
                  actionType: activityLog.actionType,
                  description: activityLog.description,
                  metadata: activityLog.metadata,
                  createdAt: activityLog.createdAt,
                  userName: users.displayName,
                })
                .from(activityLog)
                .leftJoin(users, eq(activityLog.userId, users.id))
                .where(gt(activityLog.id, lastId))
                .orderBy(desc(activityLog.createdAt))
                .limit(10)
            : db
                .select({
                  id: activityLog.id,
                  userId: activityLog.userId,
                  actionType: activityLog.actionType,
                  description: activityLog.description,
                  metadata: activityLog.metadata,
                  createdAt: activityLog.createdAt,
                  userName: users.displayName,
                })
                .from(activityLog)
                .leftJoin(users, eq(activityLog.userId, users.id))
                .orderBy(desc(activityLog.createdAt))
                .limit(20);

          const actions = await query;
          if (actions.length > 0) {
            lastId = actions[0].id;
            send({ type: "actions", data: actions });
          }
        } catch {
          // Connection closed
        }
      };

      // Initial data
      await poll();

      // Poll every 5 seconds
      const interval = setInterval(poll, 5000);

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(interval);
          clearInterval(heartbeat);
        }
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
