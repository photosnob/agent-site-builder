import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { SiteContent } from "@/lib/blocks/schema";
import { Theme } from "@/lib/blocks/theme";
import { siteImagePrefix } from "@/lib/blog/server";
import { stockPrefix } from "@/lib/media";
import { createAdminClient } from "@/lib/supabase/server";

const Body = z.object({
  heroStyle: z.enum(["full-bleed", "split", "centered", "video", "slideshow"]),
  image: z.string().url().max(800).nullable().optional(),
  videoUrl: z.string().url().max(800).nullable().optional(),
  slides: z.array(z.string().url().max(800)).max(8).optional(),
  secondaryCtaLabel: z.string().trim().max(30).nullable().optional(),
  secondaryCtaTarget: z.enum(["contact", "valuation", "listings"]).nullable().optional(),
});

/** Home hero style and media. Saved to the draft as an undoable revision; publish to go live. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const { site, user } = ctx;
  if (!site.content || !site.theme) return fail("Generate the site first");
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return fail(b.error.issues[0]?.message ?? "Invalid hero settings", 422);

  const own = siteImagePrefix(site.id);
  const stock = stockPrefix();
  const mine = (u?: string | null) => !u || u.startsWith(own);
  if (!mine(b.data.image) || !(b.data.slides ?? []).every((u) => u.startsWith(own))) return fail("Photos must come from your library", 422);
  if (b.data.videoUrl && !b.data.videoUrl.startsWith(own) && !b.data.videoUrl.startsWith(stock)) return fail("Videos must be uploaded or chosen from the stock library", 422);
  if (b.data.heroStyle === "video" && !b.data.videoUrl) return fail("Choose or upload a video first", 422);
  if (b.data.heroStyle === "slideshow" && (b.data.slides?.length ?? 0) < 2) return fail("Pick at least 2 photos for the slideshow", 422);

  const blocks = site.content.blocks.map((blk) => {
    if (blk.type !== "hero") return blk;
    const props = { ...blk.props };
    if (b.data.image !== undefined) { if (b.data.image) props.image = b.data.image; else delete props.image; }
    if (b.data.videoUrl !== undefined) { if (b.data.videoUrl) props.videoUrl = b.data.videoUrl; else delete props.videoUrl; }
    if (b.data.slides !== undefined) props.slides = b.data.slides;
    if (b.data.secondaryCtaLabel !== undefined) {
      if (b.data.secondaryCtaLabel && b.data.secondaryCtaTarget) { props.secondaryCtaLabel = b.data.secondaryCtaLabel; props.secondaryCtaTarget = b.data.secondaryCtaTarget; }
      else { delete props.secondaryCtaLabel; delete props.secondaryCtaTarget; }
    }
    return { ...blk, props };
  });
  const content = SiteContent.safeParse({ blocks });
  const theme = Theme.safeParse({ ...site.theme, heroStyle: b.data.heroStyle });
  if (!content.success || !theme.success) return fail("Those hero settings aren't valid", 422);

  const admin = createAdminClient();
  await admin.from("site_revisions").insert({ site_id: site.id, status: "applied", source: "manual", prompt: `Hero: ${b.data.heroStyle}`, content: content.data, theme: theme.data, created_by: user.id });
  await admin.from("sites").update({ content: content.data, theme: theme.data }).eq("id", site.id);
  return json({ ok: true });
}
