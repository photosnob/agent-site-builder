import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { PageContent, SiteContent } from "@/lib/blocks/schema";
import { listPages } from "@/lib/pages/server";
import { Theme } from "@/lib/blocks/theme";
import { createAdminClient } from "@/lib/supabase/server";
import { AgentProfile } from "@/lib/types";
import { revalidateSite } from "@/lib/siteUrls";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const { site } = ctx;
  if (site.status === "suspended") return fail("This site is suspended", 403);

  // Final gate: nothing goes live unless it validates and the compliance fields exist.
  const content = SiteContent.safeParse(site.content);
  const theme = Theme.safeParse(site.theme);
  const agent = AgentProfile.safeParse(site.agent);
  if (!content.success || !theme.success) return fail("The draft has errors. Regenerate or undo the last change.");
  if (!agent.success) return fail("Your license number and brokerage are required before publishing.");

  // Every page must validate too, or nothing is published.
  const pages = await listPages(site.id);
  for (const p of pages) {
    if (!PageContent.safeParse(p.content).success) return fail(`The "${p.title}" page has errors. Undo its last change first.`);
  }
  const admin = createAdminClient();
  await admin.from("sites").update({
    published_content: content.data,
    published_theme: theme.data,
    status: "live",
    published_at: new Date().toISOString(),
  }).eq("id", site.id);
  await Promise.all(pages.map((p) => admin.from("site_pages").update({ published_content: p.content }).eq("id", p.id)));
  revalidateSite(site.slug, "", "/blog", ...pages.map((p) => `/${p.slug}`));
  return json({ ok: true, slug: site.slug });
}
