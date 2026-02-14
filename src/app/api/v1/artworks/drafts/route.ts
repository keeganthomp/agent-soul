import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { artworks } from "@/db/schema/artworks";
import { eq, and, desc } from "drizzle-orm";
import { requirePaidIdentity } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const body = Object.fromEntries(new URL(request.url).searchParams);
  const identity = await requirePaidIdentity(request, body.wallet);
  if (!identity.ok) return identity.response;

  const { userId } = identity;

  const drafts = await db
    .select()
    .from(artworks)
    .where(and(eq(artworks.creatorId, userId), eq(artworks.status, "draft")))
    .orderBy(desc(artworks.createdAt));

  return NextResponse.json(drafts);
}
