"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Reached from the reset email via /auth/callback, which signs the user in first. */
export default function ResetPassword() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "no-session">("checking");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setState(data.user ? "ready" : "no-session"));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password !== String(fd.get("confirm"))) { setError("The passwords don't match."); return; }
    setBusy(true); setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else { router.push("/dashboard?reset=1"); router.refresh(); }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      {state === "checking" && <p className="mt-6 text-sm text-stone-500">One moment…</p>}
      {state === "no-session" && (
        <div className="mt-6 space-y-3 text-sm text-stone-600">
          <p>This page only works from a password reset link, and that link may have expired.</p>
          <Link className="btn" href="/forgot-password">Send a new link</Link>
        </div>
      )}
      {state === "ready" && (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="password">New password</label>
            <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm new password</label>
            <input id="confirm" name="confirm" type="password" required minLength={8} className="input" autoComplete="new-password" />
          </div>
          <p className="text-xs text-stone-400">At least 8 characters.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
        </form>
      )}
    </main>
  );
}
