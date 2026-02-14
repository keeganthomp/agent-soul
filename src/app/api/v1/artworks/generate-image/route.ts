import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/replicate";
import { requirePaidIdentity } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const identity = await requirePaidIdentity(request, body.walletAddress);
  if (!identity.ok) return identity.response;

  const { prompt } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  try {
    const imageUrl = await generateImage(prompt);
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("[generate-image] failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Image generation failed", detail: message },
      { status: 500 }
    );
  }
}
