import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/replicate";
import { requirePaidIdentity } from "@/lib/api-auth";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter(20, 60 * 60 * 1000); // 20 per hour

export async function POST(request: NextRequest) {
  const body = await request.json();
  const identity = await requirePaidIdentity(request, body.walletAddress, {
    amount: "100000", // $0.10 USDC for image generation
  });
  if (!identity.ok) return identity.response;

  const { allowed, retryAfterMs } = limiter.check(identity.walletAddress);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Max 20 generations per hour.",
        retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((retryAfterMs ?? 0) / 1000)),
        },
      }
    );
  }

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
