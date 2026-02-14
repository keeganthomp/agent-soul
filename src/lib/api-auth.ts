import { NextRequest, NextResponse } from "next/server";
import { requirePayment } from "@/lib/x402";
import { findOrCreateUserByWallet } from "@/lib/auth";

/**
 * Require paid identity for write routes.
 *
 * In production: extracts wallet from x402 payment transaction.
 * In dev (no x402 env vars): uses `bodyWalletAddress` from the request body as fallback.
 */
export async function requirePaidIdentity(
  request: NextRequest,
  bodyWalletAddress?: string
): Promise<{ ok: true; userId: string; walletAddress: string } | { ok: false; response: NextResponse }> {
  const payment = await requirePayment(request);

  if (!payment.ok) {
    return { ok: false, response: payment.response };
  }

  // Dev mode fallback: requirePayment returns walletAddress="" when env vars aren't set
  const walletAddress = payment.walletAddress || bodyWalletAddress;

  if (!walletAddress) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "walletAddress is required in request body (dev mode) or via x402 payment" },
        { status: 401 }
      ),
    };
  }

  const userId = await findOrCreateUserByWallet(walletAddress);

  return { ok: true, userId, walletAddress };
}
