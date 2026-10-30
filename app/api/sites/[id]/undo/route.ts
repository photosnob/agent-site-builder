import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

/** Restores the draft to the applied revision before the current one. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const admin = createAdminClient();
  const { data: applied } = await admin.from("site_revisions").select("id, content, theme")
    .eq("site_id", ctx.site.id).eq("status", "applied").order("created_at", { ascending: false }).limit(2);
  if (!applied || applied.length < 2) return fail("Nothing to undo");
  const [current, previous] = applied;
  await admin.from("site_revisions").update({ status: "discarded" }).eq("id", current.id);
  await admin.from("sites").update({ content: previous.content, theme: previous.theme }).eq("id", ctx.site.id);
  return json({ ok: true });
}
