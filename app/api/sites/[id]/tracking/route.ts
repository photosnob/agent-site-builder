import { revalidatePath } from "next/cache";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { SiteTracking, TRACKER_KEYS, extractTrackerId } from "@/lib/tracking";

/** Saves the agent's analytics/ad IDs. Applies to the live site right away. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return fail("Invalid settings", 422);
  const input: Record<string, string> = {};
  for (const k of TRACKER_KEYS) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) input[k] = extractTrackerId(k, v.slice(0, 5000));
  }
  const parsed = SiteTracking.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid ID", 422);
  const seo = { ...((ctx.site.seo as Record<string, unknown> | null) ?? {}), tracking: parsed.data };
  const { error } = await createAdminClient().from("sites").update({ seo }).eq("id", ctx.site.id);
  if (error) return fail(error.message, 500);
  // Tags appear on every page of the site, so refresh all of it.
  for (const m of ["s", "h"]) revalidatePath(`/${m}/${ctx.site.slug}`, "layout");
  return json({ ok: true, tracking: parsed.data });
}
