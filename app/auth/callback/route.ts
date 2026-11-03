import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Handles links from Supabase emails (signup confirmation, password reset). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const raw = url.searchParams.get("next") ?? "/onboarding";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/onboarding"; // only redirect within this app
  const linkError = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  // Expired, already-used, or opened in a different browser than the one that requested it.
  const dest = new URL(next === "/reset-password" ? "/forgot-password" : "/login", url.origin);
  if (linkError) console.warn("auth link error:", linkError);
  dest.searchParams.set("error", "link");
  return NextResponse.redirect(dest);
}
