import { NextRequest, NextResponse } from "next/server";
import { handleMiddlewareRequest, getPaymentRequiredResponse } from "@faremeter/middleware/common";
import { x402Exact } from "@faremeter/info/solana";

const FACILITATOR_URL = process.env.FACILITATOR_URL;
const MERCHANT_SOLANA_ADDRESS = process.env.MERCHANT_SOLANA_ADDRESS;

/**
 * Require x402 USDC payment on Solana devnet.
 * Returns null if payment succeeded, or a NextResponse (402/error) to return early.
 * Skips payment check when FACILITATOR_URL / MERCHANT_SOLANA_ADDRESS are not configured.
 */
export async function requirePayment(request: NextRequest): Promise<NextResponse | null> {
  if (!FACILITATOR_URL || !MERCHANT_SOLANA_ADDRESS) {
    console.warn("[x402] FACILITATOR_URL or MERCHANT_SOLANA_ADDRESS not set — skipping payment check");
    return null;
  }
  const accepts = x402Exact({
    network: "devnet",
    asset: "USDC",
    amount: "0.01",
    payTo: MERCHANT_SOLANA_ADDRESS,
  });

  const result = await handleMiddlewareRequest<NextResponse>({
    facilitatorURL: FACILITATOR_URL,
    accepts,
    resource: request.nextUrl.pathname,
    getHeader: (key: string) => request.headers.get(key) ?? undefined,
    getPaymentRequiredResponse,
    sendJSONResponse: (_status, obj) => NextResponse.json(obj, { status: 402 }),
    body: async ({ settle }) => {
      const settleResult = await settle();
      if (!settleResult.success) {
        return settleResult.errorResponse;
      }
      return undefined;
    },
  });

  return result ?? null;
}
