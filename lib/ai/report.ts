import { dayKey, type AiFeature, type AiSettings } from "./usageShared";

export interface UsageEvent {
  id: string;
  site_id: string | null;
  feature: AiFeature;
  model: string;
  prompt: string | null;
  categories: string[];
  outcome: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number | string;
  latency_ms: number | null;
  created_at: string;
}
export interface SiteInfo { id: string; slug: string; name: string; ai_daily_edit_limit: number | null }

export const FEATURES: AiFeature[] = ["edit", "generate", "import_extract"];
export const FEATURE_LABEL: Record<AiFeature, string> = { edit: "Prompt edits", generate: "Site generation", import_extract: "Site import" };
export const CATEGORY_LABEL: Record<string, string> = {
  copy: "Copy", layout: "Layout", style: "Colors & fonts", images: "Images", out_of_scope: "Out of scope", other: "Other", uncategorized: "Uncategorized",
};

const num = (v: number | string) => (typeof v === "number" ? v : Number(v) || 0);
/** Edits that actually reached the model (limit blocks cost nothing). */
const isModelEdit = (e: UsageEvent) => e.feature === "edit" && e.outcome !== "blocked_limit";

export function buildReport(events: UsageEvent[], sites: SiteInfo[], settings: AiSettings, now = new Date()) {
  const tz = settings.timezone;
  const today = dayKey(tz, now);
  const dayMs = 86_400_000;
  const days = Array.from({ length: 30 }, (_, i) => dayKey(tz, new Date(now.getTime() - (29 - i) * dayMs)));
  const last7 = new Set(days.slice(-7));
  const siteById = new Map(sites.map((s) => [s.id, s]));

  const daily = days.map((day) => ({ day, edit: 0, generate: 0, import_extract: 0, total: 0, calls: 0 }));
  const dailyIdx = new Map(days.map((d, i) => [d, i]));
  const byFeature = new Map<AiFeature, { calls: number; inputTokens: number; outputTokens: number; cost: number; errors: number }>();
  const byCategory = new Map<string, { edits: number; applied: number; refused: number; rejected: number; cost: number }>();
  const bySite = new Map<string, { edits: number; editsToday: number; blockedToday: number; cost: number; lastAt: string }>();
  let todayCost = 0, cost7 = 0, cost30 = 0, edits7 = 0, refused7 = 0, applied7 = 0, decided7 = 0, editCost7 = 0, editsToday = 0;
  const agentsToday = new Set<string>();

  for (const e of events) {
    const d = dayKey(tz, e.created_at);
    const cost = num(e.cost_usd);
    const i = dailyIdx.get(d);
    if (i !== undefined) {
      daily[i][e.feature] += cost;
      daily[i].total += cost;
      if (e.outcome !== "blocked_limit") daily[i].calls += 1;
    }
    cost30 += cost;
    if (last7.has(d)) cost7 += cost;
    if (d === today) todayCost += cost;

    if (e.outcome !== "blocked_limit") {
      const f = byFeature.get(e.feature) ?? { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0, errors: 0 };
      f.calls += 1; f.inputTokens += e.input_tokens; f.outputTokens += e.output_tokens; f.cost += cost;
      if (e.outcome === "error") f.errors += 1;
      byFeature.set(e.feature, f);
    }

    if (e.feature === "edit") {
      if (e.site_id) {
        const s = bySite.get(e.site_id) ?? { edits: 0, editsToday: 0, blockedToday: 0, cost: 0, lastAt: e.created_at };
        if (isModelEdit(e)) s.edits += 1;
        if (d === today && isModelEdit(e)) s.editsToday += 1;
        if (d === today && e.outcome === "blocked_limit") s.blockedToday += 1;
        s.cost += cost;
        if (e.created_at > s.lastAt) s.lastAt = e.created_at;
        bySite.set(e.site_id, s);
      }
      if (!isModelEdit(e)) continue;
      if (d === today) { editsToday += 1; if (e.site_id) agentsToday.add(e.site_id); }
      for (const c of e.categories.length ? e.categories : ["uncategorized"]) {
        const row = byCategory.get(c) ?? { edits: 0, applied: 0, refused: 0, rejected: 0, cost: 0 };
        row.edits += 1;
        if (e.outcome === "applied") row.applied += 1;
        if (e.outcome === "refused") row.refused += 1;
        if (e.outcome === "rejected") row.rejected += 1;
        row.cost += cost / Math.max(1, e.categories.length);
        byCategory.set(c, row);
      }
      if (last7.has(d)) {
        edits7 += 1; editCost7 += cost;
        if (e.outcome === "refused") refused7 += 1;
        if (e.outcome === "applied") applied7 += 1;
        if (["applied", "discarded"].includes(e.outcome)) decided7 += 1;
      }
    }
  }

  return {
    today,
    kpis: {
      todayCost,
      cost7,
      cost30,
      editsToday,
      agentsToday: agentsToday.size,
      avgCostPerEdit7: edits7 ? editCost7 / edits7 : 0,
      refusalRate7: edits7 ? refused7 / edits7 : 0,
      applyRate7: decided7 ? applied7 / decided7 : 0,
      capPct: settings.globalDailySpendUsd > 0 ? todayCost / settings.globalDailySpendUsd : 1,
      projectedMonthly: (cost7 / 7) * 30,
    },
    daily,
    byFeature: FEATURES.map((f) => ({ feature: f, ...(byFeature.get(f) ?? { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0, errors: 0 }) })),
    byCategory: [...byCategory.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.edits - a.edits),
    topSites: [...bySite.entries()]
      .map(([siteId, v]) => {
        const s = siteById.get(siteId);
        return { siteId, name: s?.name ?? "Unknown", slug: s?.slug ?? "", override: s?.ai_daily_edit_limit ?? null, limit: s?.ai_daily_edit_limit ?? settings.defaultDailyEditsPerSite, ...v };
      })
      .sort((a, b) => b.cost - a.cost || b.edits - a.edits)
      .slice(0, 25),
    recent: events
      .filter((e) => e.feature === "edit")
      .slice(0, 30)
      .map((e) => ({ ...e, cost: num(e.cost_usd), siteName: (e.site_id && siteById.get(e.site_id)?.name) || "—" })),
  };
}
export type Report = ReturnType<typeof buildReport>;
