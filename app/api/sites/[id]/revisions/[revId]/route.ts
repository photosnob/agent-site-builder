import { fail, json } from "@/lib/api";
import { getOwnedSite } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; revId: string }> }) {
  const { id, revId } = await params;
  const { user, site } = await getOwnedSite(id);
  if (!user) return fail("Sign in required", 401);
  if (!site) return fail("Site not found", 404);

  const body = z.object({ action: z.enum(["apply", "discard"]), acknowledgeWarnings: z.boolean().default(false) }).safeParse(await req.json());
  if (!body.success) return fail("Invalid action");

  const admin = createAdminClient();
  const { data: rev } = await admin.from("site_revisions").select("*").eq("id", revId).eq("site_id", site.id).eq("status", "proposed").maybeSingle();
  if (!rev) return fail("That change is no longer pending", 409);

  if (body.data.action === "discard") {
    await admin.from("site_revisions").update({ status: "discarded" }).eq("id", revId);
    await admin.from("ai_usage_events").update({ outcome: "discarded" }).eq("revision_id", revId);
    return json({ ok: true });
  }
  if ((rev.warnings as unknown[]).length > 0 && !body.data.acknowledgeWarnings) {
    return fail("Please review and confirm the flagged items first", 422, { warnings: rev.warnings });
  }
  await admin.from("sites").update({ content: rev.content, theme: rev.theme }).eq("id", site.id);
  await admin.from("site_revisions").update({ status: "applied" }).eq("id", revId);
  await admin.from("ai_usage_events").update({ outcome: "applied" }).eq("revision_id", revId);
  return json({ ok: true });
}
