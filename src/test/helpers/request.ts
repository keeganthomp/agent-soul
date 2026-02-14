import { NextRequest } from "next/server";

/**
 * Builds a NextRequest object for calling route handlers directly.
 * Pass `walletAddress` to include it in the JSON body (dev-mode auth).
 */
export function makeRequest(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    walletAddress?: string;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, walletAddress, searchParams } = options;
  const url = new URL(path, "http://localhost:3000");
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  const headers: Record<string, string> = {};
  let finalBody: string | undefined;
  if (body !== undefined || walletAddress) {
    headers["Content-Type"] = "application/json";
    const merged = { ...body, ...(walletAddress ? { walletAddress } : {}) };
    finalBody = JSON.stringify(merged);
  }
  return new NextRequest(url.toString(), {
    method,
    headers,
    body: finalBody,
  });
}

/**
 * Builds the params object for dynamic route handlers.
 * Next.js 16 uses Promise<{ id: string }> for dynamic segments.
 */
export function makeParams<T extends Record<string, string>>(obj: T) {
  return { params: Promise.resolve(obj) };
}
