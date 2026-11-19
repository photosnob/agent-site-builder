import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { siteImagePrefix } from "@/lib/blog/server";
import { applyHero, heroMediaError, HeroSettings } from "@/lib/hero";
import { stockPrefix } from "@/lib/media";
import { createAdminClient } from "@/lib/supabase/server";

/** Home hero style and media. Saved to the draft as an undoable revision; publish to go live. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const { site, user } = ctx;
  if (!site.content || !site.theme) return fail("Generate the site first");
  const b = HeroSettings.safeParse(await req.json().catch(() => null));
  if (!b.success) return fail(b.error.issues[0]?.message ?? "Invalid hero settings", 422);

  const mediaErr = heroMediaError(b.data, siteImagePrefix(site.id), stockPrefix());
  if (mediaErr) return fail(mediaErr, 422);
  if (b.data.heroStyle === "video" && !b.data.videoUrl) return fail("Choose or upload a video first", 422);
  if (b.data.heroStyle === "slideshow" && (b.data.slides?.length ?? 0) < 2) return fail("Pick at least 2 photos for the slideshow", 422);

  const next = applyHero(site.content, site.theme, b.data);
  if (!next) return fail("Those hero settings aren't valid", 422);

  const admin = createAdminClient();
  await admin.from("site_revisions").insert({ site_id: site.id, status: "applied", source: "manual", prompt: `Hero: ${b.data.heroStyle}`, content: next.content, theme: next.theme, created_by: user.id });
  await admin.from("sites").update({ content: next.content, theme: next.theme }).eq("id", site.id);
  return json({ ok: true });
}
