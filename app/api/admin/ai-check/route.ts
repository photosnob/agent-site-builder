import { fail, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { aiEnabled, aiModel, anthropicClient, callStructured, describeAiError } from "@/lib/ai/claude";
import { ModelEditPlan } from "@/lib/guardrails/ops";
import { getAiSettings } from "@/lib/ai/usage";

export const maxDuration = 60;

interface Step { name: string; ok: boolean; detail: string; ms?: number }

/** Runs three small checks against the Anthropic API and reports exactly what fails. */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return fail("Not found", 404);
  const steps: Step[] = [];
  const key = process.env.ANTHROPIC_API_KEY?.trim() ?? "";

  steps.push({
    name: "API key configured",
    ok: Boolean(key),
    detail: key ? `Set (starts with ${key.slice(0, 7)}…, ${key.length} characters)${key.startsWith("sk-ant-") ? "" : " ⚠ Anthropic keys usually start with sk-ant-"}` : "ANTHROPIC_API_KEY is missing in Vercel. Add it and redeploy.",
  });
  if (!aiEnabled()) return json({ model: aiModel(), steps });

  const settings = await getAiSettings(true);
  steps.push({ name: "Daily spend cap", ok: settings.globalDailySpendUsd > 0, detail: settings.globalDailySpendUsd > 0 ? `$${settings.globalDailySpendUsd}/day` : "Cap is $0, so AI features are switched off. Raise it below." });

  let t = Date.now();
  try {
    const res = await anthropicClient().messages.create({ model: aiModel(), max_tokens: 16, messages: [{ role: "user", content: "Reply with the single word OK." }] });
    const text = res.content.find((c) => c.type === "text");
    steps.push({ name: "Basic request", ok: true, detail: `Model replied "${text && text.type === "text" ? text.text.trim().slice(0, 40) : "…"}"`, ms: Date.now() - t });
  } catch (e) {
    steps.push({ name: "Basic request", ok: false, detail: describeAiError(e).detail, ms: Date.now() - t });
    return json({ model: aiModel(), steps });
  }

  t = Date.now();
  try {
    const { data } = await callStructured({
      track: { feature: "edit", userId: admin.id, prompt: "[admin connection test]" },
      toolName: "propose_edit",
      toolDescription: "Propose edit operations for a website.",
      schema: ModelEditPlan,
      maxTokens: 800,
      system: "You edit a website by returning edit operations. Keep block ids exactly as given. Paths for set_text are relative to props.",
      user: 'Page blocks: [{"id":"hero-test","type":"hero","props":{"headline":"Homes in Tucson","subheadline":"Helping buyers.","ctaLabel":"Talk","ctaTarget":"contact"}}]\n\nRequest: change the headline to "Tucson homes, done right".',
    });
    steps.push({ name: "Structured edit (what prompt edits use)", ok: data.ops.length > 0, detail: data.ops.length ? `Returned ${data.ops.length} operation(s): ${data.ops.map((o) => o.op).join(", ")}` : `No operations returned. Summary: ${data.summary}`, ms: Date.now() - t });
  } catch (e) {
    steps.push({ name: "Structured edit (what prompt edits use)", ok: false, detail: describeAiError(e).detail, ms: Date.now() - t });
  }
  return json({ model: aiModel(), steps });
}
