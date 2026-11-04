import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { verify } from "@/lib/crypto";
import { exchangeCode, saveConnection } from "@/lib/instagram";
import { revalidateSite } from "@/lib/siteUrls";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const back = new URL("/dashboard/settings", req.url);
  const done = (status: string) => { back.searchParams.set("ig", status); const r = NextResponse.redirect(back); r.cookies.delete("ig_state"); return r; };
  if (url.searchParams.get("error")) return done("cancelled");

  const state = url.searchParams.get("state") ?? "";
  const payload = verify(state);
  const { user } = await requireUser();
  if (!payload || state !== req.cookies.get("ig_state")?.value || !user) return done("expired");
  const [siteId, userId] = payload.split(":");
  if (userId !== user.id) return done("expired");
  const { data: site } = await createAdminClient().from("sites").select("id, slug").eq("id", siteId).eq("owner_id", user.id).maybeSingle();
  if (!site) return done("expired");

  try {
    await saveConnection(site.id, await exchangeCode(url.searchParams.get("code") ?? ""));
    revalidateSite(site.slug, "");
    return done("connected");
  } catch (e) {
    console.error("[instagram] connect failed", e);
    return done("failed");
  }
}
