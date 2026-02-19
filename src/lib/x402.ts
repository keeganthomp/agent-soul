import { NextRequest, NextResponse } from "next/server";
import { handleMiddlewareRequest, getPaymentRequiredResponse } from "@faremeter/middleware/common";
import { x402Exact } from "@faremeter/info/solana";
import { VersionedTransaction } from "@solana/web3.js";

const FACILITATOR_URL = process.env.FACILITATOR_URL;
const MERCHANT_SOLANA_ADDRESS = process.env.MERCHANT_SOLANA_ADDRESS;

/** SPL Token program ID */
const TOKEN_PROGRAM_ID = "TokenkegQEqKwypE6SgNPDhUcbfFBkH4YLjQ2Nn3CVSe";

/**
 * Extract the payer's wallet address from an x402 payment header.
 *
 * Deserializes the transaction and finds the SPL Token transfer (or
 * transferChecked) instruction, then returns the authority (account index 2)
 * which is the wallet that signed and authorised the USDC transfer — i.e. the
 * actual user, not the fee-payer treasury.
 */
function extractPayerWallet(paymentHeader: string, _merchantAddress: string): string | null {
  try {
    const outer = JSON.parse(atob(paymentHeader));
    const txBytes = Buffer.from(outer.payload.transaction, "base64");
    const tx = VersionedTransaction.deserialize(txBytes);
    const keys = tx.message.staticAccountKeys;

    for (const ix of tx.message.compiledInstructions) {
      const programId = keys[ix.programIdIndex].toBase58();
      if (programId !== TOKEN_PROGRAM_ID) continue;

      // SPL Token instruction discriminator: 3 = Transfer, 12 = TransferChecked
      const disc = ix.data[0];
      if (disc !== 3 && disc !== 12) continue;

      // Account layout: [source, destination, authority]
      const authorityIndex = ix.accountKeyIndexes[2];
      return keys[authorityIndex].toBase58();
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
