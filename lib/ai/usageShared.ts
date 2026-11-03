import { z } from "zod";

/** Client-safe AI usage helpers (no server imports). */

export type AiFeature = "generate" | "import_extract" | "edit";

export const AiSettings = z.object({
  defaultDailyEditsPerSite: z.number().int().min(0).max(10000),
  globalDailySpendUsd: z.number().min(0).max(100000),
  timezone: z.string().min(3).max(60),
  pricing: z.object({
    inputPerM: z.number().min(0).max(1000),
    outputPerM: z.number().min(0).max(1000),
    cacheWritePerM: z.number().min(0).max(1000),
    cacheReadPerM: z.number().min(0).max(1000),
  }),
});
export type AiSettings = z.infer<typeof AiSettings>;

export const DEFAULT_SETTINGS: AiSettings = {
  defaultDailyEditsPerSite: 30,
  globalDailySpendUsd: 10,
  timezone: "America/Los_Angeles",
  pricing: { inputPerM: 2, outputPerM: 10, cacheWritePerM: 2.5, cacheReadPerM: 0.1 },
};

export interface Usage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function costOf(u: Usage, p: AiSettings["pricing"]) {
  return (
    ((u.input_tokens ?? 0) * p.inputPerM +
      (u.output_tokens ?? 0) * p.outputPerM +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWritePerM +
      (u.cache_read_input_tokens ?? 0) * p.cacheReadPerM) /
    1_000_000
  );
}

/** Midnight today in the given time zone, as a UTC ISO string. */
export function startOfDay(tz: string, now = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const utcMidnight = new Date(`${ymd}T00:00:00Z`);
  const offset = tzOffsetMinutes(tz, utcMidnight);
  return new Date(utcMidnight.getTime() - offset * 60_000).toISOString();
}

/** Calendar day (YYYY-MM-DD) of an instant in a time zone. */
export function dayKey(tz: string, d: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

function tzOffsetMinutes(tz: string, at: Date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

export interface TrackInfo {
  feature: AiFeature;
  siteId?: string | null;
  userId?: string | null;
  prompt?: string;
}

/** Buckets an edit plan's operations into categories for reporting. */
export function categorizeOps(ops: { op: string }[], refused: boolean): string[] {
  if (refused) return ["out_of_scope"];
  const map: Record<string, string> = {
    set_text: "copy", set_list_item: "copy", remove_list_item: "copy",
    add_block: "layout", remove_block: "layout", move_block: "layout",
    set_theme: "style",
    set_image: "images", set_image_size: "images", add_listing: "images",
  };
  return [...new Set(ops.map((o) => map[o.op] ?? "other"))].sort();
}
