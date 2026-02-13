import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listings } from "@/db/schema/listings";
import { eq, and } from "drizzle-orm";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;

  const [listing] = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.id, id),
        eq(listings.sellerId, auth.userId),
        eq(listings.status, "active")
      )
    )
    .limit(1);

  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found or not cancellable" },
      { status: 404 }
    );
  }

  await db
    .update(listings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(listings.id, id));

  return NextResponse.json({ success: true });
}
