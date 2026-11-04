import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { newBlockId, SiteContent, type Block } from "@/lib/blocks/schema";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidateSite } from "@/lib/siteUrls";

/**
 * Turn the home-page Instagram section on/off (applies to the draft and, if the
 * site is live, the published page too), or disconnect the account.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const body = z.object({ action: z.enum(["show", "hide", "disconnect"]) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid action", 422);
  const admin = createAdminClient();
  const { site } = ctx;

  if (body.data.action === "disconnect") {
    await admin.from("instagram_connections").delete().eq("site_id", site.id);
  }
  const show = body.data.action === "show";
  const toggle = (c: SiteContent | null) => {
    if (!c) return c;
    const blocks: Block[] = c.blocks.filter((b) => b.type !== "instagram");
    if (show) {
      const ci = blocks.findIndex((b) => b.type === "contact");
      blocks.splice(ci > 0 ? ci : blocks.length, 0, { type: "instagram", id: newBlockId("instagram"), props: { headline: "Follow along on Instagram", count: 3 } });
    }
    const parsed = SiteContent.safeParse({ blocks });
    return parsed.success ? parsed.data : c;
  };
  const update: Record<string, unknown> = { content: toggle(site.content) };
  if (site.published_content) update.published_content = toggle(site.published_content);
  await admin.from("sites").update(update).eq("id", site.id);
  revalidateSite(site.slug, "");
  return json({ ok: true });
}
