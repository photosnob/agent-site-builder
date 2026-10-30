import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { aiEnabled } from "@/lib/ai/claude";
import { planAndApplyEdit } from "@/lib/ai/edit";
import { getAssets } from "@/lib/sites";
import { createAdminClient } from "@/lib/supabase/server";
import { AgentProfile } from "@/lib/types";
import { z } from "zod";

export const maxDuration = 60;
const EDITS_PER_HOUR = 40;

/** Turns a prompt into a *proposed* revision. Nothing changes until the agent accepts it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const { site, user } = ctx;
  if (!aiEnabled()) return fail("AI editing needs ANTHROPIC_API_KEY to be set", 503);
  if (!site.content || !site.theme || !site.template) return fail("Generate the site first");

  const body = z.object({ prompt: z.string().trim().min(3).max(1000) }).safeParse(await req.json());
  if (!body.success) return fail("Describe the change in a sentence or two (max 1,000 characters).");

  const admin = createAdminClient();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("site_revisions").select("id", { count: "exact", head: true })
    .eq("site_id", site.id).eq("source", "ai_edit").gte("created_at", since);
  if ((count ?? 0) >= EDITS_PER_HOUR) return fail("You've hit the hourly edit limit. Try again in a bit.", 429);

  const agent = AgentProfile.parse(site.agent);
  const assets = await getAssets(site.id);
  let result;
  try {
    result = await planAndApplyEdit({ prompt: body.data.prompt, content: site.content, theme: site.theme, templateId: site.template, agent, assets, imported: site.import_data });
  } catch (e) {
    console.error(e);
    return fail("The editor couldn't work out that change. Try rephrasing it.", 502);
  }

  const { data: rev } = await admin.from("site_revisions").insert({
    site_id: site.id,
    status: result.ok ? "proposed" : "discarded",
    source: "ai_edit",
    prompt: body.data.prompt,
    ops: result.plan.ops,
    warnings: result.warnings,
    content: result.content,
    theme: result.theme,
    created_by: user.id,
  }).select("id").single();

  return json({
    revisionId: result.ok ? rev?.id : null,
    ok: result.ok,
    summary: result.plan.summary,
    errors: result.errors,
    warnings: result.warnings,
    opCount: result.plan.ops.length,
  });
}
