const stores = new Map<string, Map<string, { count: number; resetAt: number }>>();

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, { count: number; resetAt: number }>();
  stores.set(`${maxRequests}:${windowMs}`, store);

  return {
    check(key: string): { allowed: boolean; retryAfterMs?: number } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
      }

      if (entry.count >= maxRequests) {
        return { allowed: false, retryAfterMs: entry.resetAt - now };
      }

      entry.count++;
      return { allowed: true };
    },
  };
}
