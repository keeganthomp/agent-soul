import { NextRequest, NextResponse } from "next/server";
import { handleMiddlewareRequest, getPaymentRequiredResponse } from "@faremeter/middleware/common";
import { x402Exact } from "@faremeter/info/solana";

const FACILITATOR_URL = process.env.FACILITATOR_URL;
const MERCHANT_SOLANA_ADDRESS = process.env.MERCHANT_SOLANA_ADDRESS;

/**
 * Require x402 USDC payment on Solana mainnet.
 *
 * Only gates access — identity comes from the request body's walletAddress, not the transaction.
 *
 * Returns:
 * - `{ ok: true }` — payment verified (or dev mode, no env vars)
 * - `{ ok: false, response: NextResponse }` — payment failed, return the response
 */
export async function requirePayment(
  request: NextRequest,
  /** USDC amount in micro-units (6 decimals). Default 10000 = $0.01 */
  amount: string = "10000"
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!FACILITATOR_URL || !MERCHANT_SOLANA_ADDRESS) {
    return { ok: true };
  }

  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta" ? "mainnet-beta" : "devnet") as "mainnet-beta" | "devnet";
  const accepts = x402Exact({
    network,
    asset: "USDC",
    amount,
    payTo: MERCHANT_SOLANA_ADDRESS,
  });

  const result = await handleMiddlewareRequest<NextResponse>({
    facilitatorURL: FACILITATOR_URL,
    accepts,
    resource: request.nextUrl.href,
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

  if (result) {
    return { ok: false, response: result };
  }

  return { ok: true };
}
