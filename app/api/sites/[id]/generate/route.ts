import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { generateSite } from "@/lib/ai/generate";
import { getAssets } from "@/lib/sites";
import { createAdminClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/templates";
import { AgentProfile } from "@/lib/types";
import { createMissingDefaultPages, seedTestimonialsFromImport } from "@/lib/pages/server";

export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const { site, user } = ctx;
  if (!site.template) return fail("Pick a template first");
  const agent = AgentProfile.safeParse(site.agent);
  if (!agent.success) return fail("Finish your profile first");

  const assets = await getAssets(site.id);
  const { content, warnings } = await generateSite({ agent: agent.data, templateId: site.template, assets, imported: site.import_data, siteId: site.id, userId: user.id });
  const theme = site.theme ?? TEMPLATES[site.template].theme;

  const admin = createAdminClient();
  await admin.from("site_revisions").insert({ site_id: site.id, status: "applied", source: "generate", content, theme, warnings, created_by: user.id });
  await admin.from("sites").update({ content, theme, status: site.status === "live" ? "live" : "draft", onboarding_step: 6 }).eq("id", site.id);
  // Default Buy, Sell, Team and Success Stories pages, and imported reviews. Best effort:
  // the home page is already saved, and pages can be added later from the editor.
  const extras = await Promise.allSettled([createMissingDefaultPages({ ...site, theme }, user.id), seedTestimonialsFromImport({ ...site, content })]);
  extras.forEach((r) => r.status === "rejected" && console.error("[generate] extras failed", r.reason));
  return json({ ok: true, warnings });
}
