import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!token || !verifySession(token)) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
