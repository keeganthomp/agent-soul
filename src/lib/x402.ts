import { NextRequest, NextResponse } from "next/server";
import { handleMiddlewareRequest, getPaymentRequiredResponse } from "@faremeter/middleware/common";
import { x402Exact } from "@faremeter/info/solana";
import { VersionedTransaction } from "@solana/web3.js";

const FACILITATOR_URL = process.env.FACILITATOR_URL;
const MERCHANT_SOLANA_ADDRESS = process.env.MERCHANT_SOLANA_ADDRESS;

/**
 * Extract the payer's wallet address from an x402 payment header.
 * The fee payer (merchant) is at index 0; the other required signer is the payer.
 */
function extractPayerWallet(paymentHeader: string, merchantAddress: string): string | null {
  try {
    const outer = JSON.parse(atob(paymentHeader));
    const txBytes = Buffer.from(outer.payload.transaction, "base64");
    const tx = VersionedTransaction.deserialize(txBytes);
    const numSigners = tx.message.header.numRequiredSignatures;
    for (let i = 0; i < numSigners; i++) {
      const key = tx.message.staticAccountKeys[i].toBase58();
      if (key !== merchantAddress) return key;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Require x402 USDC payment on Solana mainnet.
 *
 * Returns:
 * - `{ ok: true, walletAddress: string }` — payment verified, wallet extracted
 * - `{ ok: true, walletAddress: "" }` — dev mode (no env vars), caller should use body fallback
 * - `{ ok: false, response: NextResponse }` — payment failed, return the response
 */
export async function requirePayment(
  request: NextRequest,
  /** USDC amount in micro-units (6 decimals). Default 10000 = $0.01 */
  amount: string = "10000"
): Promise<{ ok: true; walletAddress: string } | { ok: false; response: NextResponse }> {
  if (!FACILITATOR_URL || !MERCHANT_SOLANA_ADDRESS) {
    console.warn("[x402] FACILITATOR_URL or MERCHANT_SOLANA_ADDRESS not set — skipping payment check");
    return { ok: true, walletAddress: "" };
  }

  // Extract wallet from payment header before verification (header is consumed by middleware)
  const paymentHeader = request.headers.get("X-PAYMENT");
  const payerWallet = paymentHeader
    ? extractPayerWallet(paymentHeader, MERCHANT_SOLANA_ADDRESS)
    : null;

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

  if (!payerWallet) {
    return { ok: false, response: NextResponse.json({ error: "Could not extract payer wallet from payment" }, { status: 400 }) };
  }

  return { ok: true, walletAddress: payerWallet };
}
