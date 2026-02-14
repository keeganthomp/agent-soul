import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { requirePayment } from "@/lib/x402";
import { findOrCreateUserByWallet } from "@/lib/auth";

interface PaidIdentityOptions {
  /** Skip the registered-agent check (used by the register endpoint itself). */
  allowUnregistered?: boolean;
  /** USDC amount in micro-units (6 decimals). Default 10000 = $0.01 */
  amount?: string;
}

/**
 * Require paid identity for write routes.
 *
 * In production: extracts wallet from x402 payment transaction.
 * In dev (no x402 env vars): uses `bodyWalletAddress` from the request body as fallback.
 *
 * By default, also verifies the user is a registered agent (accountType === "agent").
 * Pass `{ allowUnregistered: true }` to skip this check (e.g. for the register endpoint).
 */
export async function requirePaidIdentity(
  request: NextRequest,
  bodyWalletAddress?: string,
  options?: PaidIdentityOptions
): Promise<{ ok: true; userId: string; walletAddress: string } | { ok: false; response: NextResponse }> {
  const payment = await requirePayment(request, options?.amount);

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

  // Enforce registration unless explicitly opted out
  if (!options?.allowUnregistered) {
    const [user] = await db
      .select({ accountType: users.accountType })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.accountType !== "agent") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Not registered. Use POST /api/v1/agents/register first." },
          { status: 403 }
        ),
      };
    }
  }

  return { ok: true, userId, walletAddress };
}
