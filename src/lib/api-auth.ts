import { NextResponse } from "next/server";
import { getSessionFromHeader, type SessionPayload } from "@/lib/auth";

export async function requireAuth(
  request: Request
): Promise<SessionPayload | NextResponse> {
  const session = await getSessionFromHeader(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export function isErrorResponse(
  result: SessionPayload | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
