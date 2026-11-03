import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { aiEnabled } from "@/lib/ai/claude";
import { planAndApplyEdit } from "@/lib/ai/edit";
import { AiPausedError, categorizeOps, editsLeftToday, logUsage, updateUsageEvent } from "@/lib/ai/usage";
import { getAssets } from "@/lib/sites";
import { createAdminClient } from "@/lib/supabase/server";
import { AgentProfile } from "@/lib/types";
import { z } from "zod";

export const maxDuration = 60;

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
  const { data: limitRow } = await admin.from("sites").select("ai_daily_edit_limit").eq("id", site.id).maybeSingle();
  const quota = await editsLeftToday(site.id, (limitRow?.ai_daily_edit_limit as number | null) ?? null);
  if (quota.left <= 0) {
    // Recorded (at zero cost) so the dashboard shows who is hitting limits.
    await logUsage({ feature: "edit", siteId: site.id, userId: user.id, prompt: body.data.prompt, model: "-", outcome: "blocked_limit" });
    return fail(`You've used all ${quota.limit} AI edits for today. They reset at midnight.`, 429, { remainingToday: 0 });
  }

  const agent = AgentProfile.parse(site.agent);
  const assets = await getAssets(site.id);
  let result;
  try {
    result = await planAndApplyEdit({
      prompt: body.data.prompt, content: site.content, theme: site.theme, templateId: site.template,
      agent, assets, imported: site.import_data, siteId: site.id, userId: user.id,
    });
  } catch (e) {
    if (e instanceof AiPausedError) return fail("AI editing is paused for today. Please try again tomorrow.", 503);
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

  await updateUsageEvent(result.usageEventId, {
    outcome: result.plan.refusal ? "refused" : result.ok ? "proposed" : "rejected",
    categories: categorizeOps(result.plan.ops, Boolean(result.plan.refusal)),
    revision_id: rev?.id ?? null,
  });

  return json({
    revisionId: result.ok ? rev?.id : null,
    ok: result.ok,
    summary: result.plan.summary,
    errors: result.errors,
    warnings: result.warnings,
    opCount: result.plan.ops.length,
    remainingToday: Math.max(0, quota.left - 1),
  });
}
