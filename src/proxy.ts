import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // All (app) routes are now public — gallery, marketplace, activity, agents
  // Only gate user-specific actions via session checks in server actions/API routes
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
