"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND, BrandFonts, Logo } from "@/components/marketing/Brand";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("error") === "link" ? "That link has expired or was already used. Try signing in, or request a new link." : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const supabase = createClient();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (error) setError(error.message);
      else if (!data.session) setNotice("Check your email to confirm your account, then come back here.");
      else router.push("/onboarding");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(/invalid login/i.test(error.message) ? "That email and password don't match. Forgot your password?" : error.message);
      else router.push(params.get("next") || "/dashboard");
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen" style={{ background: BRAND.ivory, color: BRAND.evergreen, fontFamily: BRAND.sans }}>
    <BrandFonts />
    <header className="px-6 py-5"><Link href="/" aria-label="Launch and List home"><Logo size={22} /></Link></header>
    <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-sm flex-col justify-center px-6 pb-20">
      <h1 className="text-[2.6rem] leading-none" style={{ fontFamily: BRAND.serif, fontWeight: 500 }}>{mode === "signup" ? <>Launch your site<span style={{ color: BRAND.brass }}>.</span></> : <>Welcome back<span style={{ color: BRAND.brass }}>.</span></>}</h1>
      {mode === "signup" && <p className="mt-3 text-[15px]" style={{ color: BRAND.ink }}>Create your account. Next, a few questions about your market.</p>}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" defaultValue={params.get("email") ?? ""} />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="password">Password</label>
            {mode === "login" && <Link href="/forgot-password" className="text-xs text-stone-500 underline hover:text-stone-900">Forgot password?</Link>}
          </div>
          <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}
        <button className="w-full rounded-[2px] px-4 py-3 text-[15px] font-bold disabled:opacity-60" style={{ background: mode === "signup" ? BRAND.brass : BRAND.evergreen, color: mode === "signup" ? BRAND.evergreen : BRAND.ivory }} disabled={busy}>{busy ? "…" : mode === "signup" ? "create my account." : "sign in."}</button>
      </form>
      <p className="mt-6 text-sm text-stone-500">
        {mode === "signup" ? <>Already have an account? <Link className="underline" href="/login">Sign in</Link></> : <>New here? <Link className="underline" href="/signup">Create an account</Link></>}
      </p>
    </main>
    </div>
  );
}
