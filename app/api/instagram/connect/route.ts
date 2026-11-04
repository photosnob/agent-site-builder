import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sign } from "@/lib/crypto";
import { authorizeUrl, instagramConfigured } from "@/lib/instagram";

/** Starts Business Login for Instagram for the signed-in agent's site. */
export async function GET(req: Request) {
  const { supabase, user } = await requireUser();
  const back = new URL("/dashboard/settings", req.url);
  if (!user) return NextResponse.redirect(new URL("/login?next=/dashboard/settings", req.url));
  if (!instagramConfigured()) { back.searchParams.set("ig", "not-configured"); return NextResponse.redirect(back); }
  const { data: site } = await supabase.from("sites").select("id").eq("owner_id", user.id).maybeSingle();
  if (!site) return NextResponse.redirect(new URL("/onboarding", req.url));
  const state = sign(`${site.id}:${user.id}`);
  const res = NextResponse.redirect(authorizeUrl(state));
  // Bind the flow to this browser too, so a leaked link can't attach someone else's account.
  res.cookies.set("ig_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/instagram" });
  return res;
}
