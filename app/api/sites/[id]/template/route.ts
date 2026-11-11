import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { SiteContent } from "@/lib/blocks/schema";
import { listStockVideos } from "@/lib/media";
import { createAdminClient } from "@/lib/supabase/server";
import { TEMPLATES, type TemplateId } from "@/lib/templates";

/**
 * Switches the site's design after onboarding. Content stays exactly as it is;
 * colors, fonts and section layouts change. Saved to the draft as an undoable
 * revision, so it can be previewed and only goes live on publish.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const { site, user } = ctx;
  if (!site.content) return fail("Generate the site first");
  const b = z.object({ template: z.enum(Object.keys(TEMPLATES) as [TemplateId, ...TemplateId[]]) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return fail("Pick a template", 422);
  const t = TEMPLATES[b.data.template];
  const theme = { ...t.theme };

  // A video template with no video yet starts on the first stock clip, like a new site would.
  let blocks = site.content.blocks;
  const hero = blocks.find((x) => x.type === "hero");
  if (theme.heroStyle === "video" && hero?.type === "hero" && !hero.props.videoUrl) {
    const stock = (await listStockVideos().catch(() => []))[0]?.url;
    if (stock) blocks = blocks.map((x) => (x.type === "hero" ? { ...x, props: { ...x.props, videoUrl: stock, videoSpeed: 0.75 } } : x));
    else theme.heroStyle = "full-bleed";
  }
  // A slideshow the agent already set up carries over to templates that don't call for video.
  if (theme.heroStyle !== "video" && site.theme?.heroStyle === "slideshow" && hero?.type === "hero" && (hero.props.slides?.length ?? 0) >= 2) theme.heroStyle = "slideshow";
  const content = SiteContent.safeParse({ blocks });
  if (!content.success) return fail("Couldn't apply that template", 422);

  const admin = createAdminClient();
  await admin.from("site_revisions").insert({ site_id: site.id, status: "applied", source: "manual", prompt: `Template: ${t.name}`, content: content.data, theme, created_by: user.id });
  const { error } = await admin.from("sites").update({ template: t.id, theme, content: content.data }).eq("id", site.id);
  if (error) return fail(error.message.includes("template_check") ? "This template needs the 0008 database migration." : error.message, 500);
  return json({ ok: true, template: t.id });
}
