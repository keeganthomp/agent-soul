import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { artworks } from "@/db/schema/artworks";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [artwork] = await db
    .select({ metadataJson: artworks.metadataJson })
    .from(artworks)
    .where(eq(artworks.id, id))
    .limit(1);

  if (!artwork?.metadataJson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(artwork.metadataJson, {
    headers: { "Content-Type": "application/json" },
  });
}
