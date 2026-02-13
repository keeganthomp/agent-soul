/**
 * Builds a Request object for calling route handlers directly.
 */
export function makeRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {}
): Request {
  const { method = "GET", token, body, searchParams } = options;
  const url = new URL(path, "http://localhost:3000");
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return new Request(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Builds the params object for dynamic route handlers.
 * Next.js 16 uses Promise<{ id: string }> for dynamic segments.
 */
export function makeParams<T extends Record<string, string>>(obj: T) {
  return { params: Promise.resolve(obj) };
}
