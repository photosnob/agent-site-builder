"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ForgotPassword() {
  const params = useSearchParams();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") === "link" ? "That reset link has expired or was already used. Request a new one below." : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    // Rate limits are worth surfacing; "no such user" is not (don't reveal who has an account).
    if (error && /rate|too many|security purposes/i.test(error.message)) setError("Too many requests. Please wait a few minutes and try again.");
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      {sent ? (
        <div className="mt-6 space-y-3 text-sm text-stone-600">
          <p>If there&apos;s an account with that email, we&apos;ve sent a link to reset your password. It expires in an hour.</p>
          <p>Open the link in this same browser. Don&apos;t see it? Check your spam folder.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <p className="text-sm text-stone-600">Enter the email you signed up with and we&apos;ll send you a reset link.</p>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
      <p className="mt-6 text-sm text-stone-500"><Link className="underline" href="/login">Back to sign in</Link></p>
    </main>
  );
}

export default function Page() {
  return <Suspense><ForgotPassword /></Suspense>;
}
