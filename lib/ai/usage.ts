import { createAdminClient } from "../supabase/server";
import { AiSettings, DEFAULT_SETTINGS, costOf, startOfDay, type TrackInfo, type Usage } from "./usageShared";

export * from "./usageShared";

let cache: { at: number; value: AiSettings } | null = null;

/** Settings are cached for 30s per server instance. */
export async function getAiSettings(fresh = false): Promise<AiSettings> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.value;
  try {
    const { data } = await createAdminClient().from("app_settings").select("value").eq("key", "ai").maybeSingle();
    const parsed = AiSettings.safeParse({ ...DEFAULT_SETTINGS, ...(data?.value ?? {}) });
    const value = parsed.success ? parsed.data : DEFAULT_SETTINGS;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAiSettings(value: AiSettings) {
  await createAdminClient().from("app_settings").upsert({ key: "ai", value, updated_at: new Date().toISOString() });
  cache = { at: Date.now(), value };
}

export class AiPausedError extends Error {
  constructor() {
    super("AI features are paused for today because the daily spending cap was reached.");
  }
}

/** Throws AiPausedError when today's spend has reached the global cap. */
export async function assertUnderGlobalCap() {
  const s = await getAiSettings();
  if (s.globalDailySpendUsd <= 0) throw new AiPausedError();
  const { data } = await createAdminClient().rpc("ai_spend_since", { since: startOfDay(s.timezone) });
  if (Number(data ?? 0) >= s.globalDailySpendUsd) throw new AiPausedError();
}

/** How many prompt edits this site has left today. */
export async function editsLeftToday(siteId: string, siteLimit: number | null) {
  const s = await getAiSettings();
  const limit = siteLimit ?? s.defaultDailyEditsPerSite;
  const { count } = await createAdminClient()
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId)
    .eq("feature", "edit")
    .neq("outcome", "blocked_limit")
    .gte("created_at", startOfDay(s.timezone));
  return { limit, used: count ?? 0, left: Math.max(0, limit - (count ?? 0)) };
}

export async function logUsage(t: TrackInfo & { model: string; usage?: Usage; latencyMs?: number; outcome?: string; error?: string; categories?: string[] }) {
  try {
    const s = await getAiSettings();
    const { data } = await createAdminClient()
      .from("ai_usage_events")
      .insert({
        site_id: t.siteId ?? null,
        user_id: t.userId ?? null,
        feature: t.feature,
        model: t.model,
        prompt: t.prompt?.slice(0, 1000) ?? null,
        categories: t.categories ?? [],
        outcome: t.outcome ?? "ok",
        input_tokens: t.usage?.input_tokens ?? 0,
        output_tokens: t.usage?.output_tokens ?? 0,
        cache_read_tokens: t.usage?.cache_read_input_tokens ?? 0,
        cache_write_tokens: t.usage?.cache_creation_input_tokens ?? 0,
        cost_usd: t.usage ? costOf(t.usage, s.pricing) : 0,
        latency_ms: t.latencyMs ?? null,
        error: t.error?.slice(0, 500) ?? null,
      })
      .select("id")
      .single();
    return (data?.id as string | undefined) ?? null;
  } catch (e) {
    console.error("usage logging failed", e); // never block the feature on logging
    return null;
  }
}

export async function updateUsageEvent(id: string | null | undefined, patch: { outcome?: string; categories?: string[]; revision_id?: string | null }) {
  if (!id) return;
  try { await createAdminClient().from("ai_usage_events").update(patch).eq("id", id); } catch (e) { console.error(e); }
}
