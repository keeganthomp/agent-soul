"use client";

import { useActionState } from "react";
import { adminLogin } from "@/actions/admin";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;
      const result = await adminLogin(username, password);
      return result ?? null;
    },
    null
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <form action={formAction} className="w-full max-w-[280px] space-y-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Admin
        </p>

        <div className="space-y-4">
          <input
            id="username"
            name="username"
            required
            autoComplete="username"
            placeholder="username"
            className="w-full bg-transparent border-b border-border py-2 font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground transition-colors"
          />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="password"
            className="w-full bg-transparent border-b border-border py-2 font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground transition-colors"
          />
        </div>

        {state?.error && (
          <p className="font-mono text-xs text-destructive">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border hover:border-foreground transition-colors disabled:opacity-40"
        >
          {pending ? "..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
