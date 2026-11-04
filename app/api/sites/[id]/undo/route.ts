import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

/** Restores the draft (home or one page) to the applied revision before the current one. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const { pageId } = z.object({ pageId: z.string().uuid().nullable().optional() }).parse(await req.json().catch(() => ({})));
  const admin = createAdminClient();
  let q = admin.from("site_revisions").select("id, content, theme").eq("site_id", ctx.site.id).eq("status", "applied");
  q = pageId ? q.eq("page_id", pageId) : q.is("page_id", null);
  const { data: applied } = await q.order("created_at", { ascending: false }).limit(2);
  if (!applied || applied.length < 2) return fail("Nothing to undo");
  const [current, previous] = applied;
  await admin.from("site_revisions").update({ status: "discarded" }).eq("id", current.id);
  if (pageId) {
    await admin.from("site_pages").update({ content: previous.content }).eq("id", pageId).eq("site_id", ctx.site.id);
    await admin.from("sites").update({ theme: previous.theme }).eq("id", ctx.site.id);
  } else {
    await admin.from("sites").update({ content: previous.content, theme: previous.theme }).eq("id", ctx.site.id);
  }
  return json({ ok: true });
}
