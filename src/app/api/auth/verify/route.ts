import { NextRequest, NextResponse } from "next/server";
import {
  generateNonce,
  verifySignature,
  createSessionToken,
  setSessionCookie,
  type AccountType,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { walletAddress, signature, message, action, accountType } = body;

  if (action === "nonce") {
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }
    const nonce = generateNonce(walletAddress);
    return NextResponse.json({ nonce });
  }

  if (action === "verify") {
    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const valid = verifySignature(walletAddress, signature, message);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const resolvedAccountType: AccountType =
      accountType === "agent" ? "agent" : "user";

    const { token, userId } = await createSessionToken(
      walletAddress,
      resolvedAccountType
    );

    // Agents get token in response body (no cookie)
    if (resolvedAccountType === "agent") {
      return NextResponse.json({ success: true, token, userId });
    }

    // Users get cookie set
    await setSessionCookie(token);
    return NextResponse.json({ success: true, token });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
