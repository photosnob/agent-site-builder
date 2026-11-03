import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, categorizeOps, costOf, dayKey, startOfDay } from "../lib/ai/usage";
import { buildReport, type UsageEvent } from "../lib/ai/report";

test("cost uses per-million rates for every token type", () => {
  const c = costOf({ input_tokens: 1_000_000, output_tokens: 100_000, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 0 }, DEFAULT_SETTINGS.pricing);
  assert.equal(Number(c.toFixed(4)), 2 + 1 + 0.1);
});

test("start of day is local midnight in the configured time zone", () => {
  // 2026-11-03 06:00 UTC is 2026-11-02 22:00 in Los Angeles (PST, UTC-8)
  const now = new Date("2026-11-03T06:00:00Z");
  assert.equal(startOfDay("America/Los_Angeles", now), "2026-11-02T08:00:00.000Z");
  assert.equal(dayKey("America/Los_Angeles", now), "2026-11-02");
  // Summer (PDT, UTC-7)
  assert.equal(startOfDay("America/Los_Angeles", new Date("2026-07-01T12:00:00Z")), "2026-07-01T07:00:00.000Z");
});

test("edit operations are bucketed into categories", () => {
  assert.deepEqual(categorizeOps([{ op: "set_text" }, { op: "set_theme" }, { op: "set_text" }], false), ["copy", "style"]);
  assert.deepEqual(categorizeOps([], true), ["out_of_scope"]);
});

test("report totals, categories and limit blocks", () => {
  const now = new Date("2026-11-03T06:00:00Z"); // Nov 2 in LA
  const ev = (o: Partial<UsageEvent>): UsageEvent => ({
    id: Math.random().toString(), site_id: "s1", feature: "edit", model: "m", prompt: "p", categories: ["copy"], outcome: "applied",
    input_tokens: 1000, output_tokens: 100, cost_usd: "0.010000", latency_ms: 900, created_at: "2026-11-03T05:00:00Z", ...o,
  });
  const events = [
    ev({}),
    ev({ outcome: "refused", categories: ["out_of_scope"] }),
    ev({ outcome: "blocked_limit", cost_usd: 0, categories: [] }),
    ev({ feature: "generate", cost_usd: 0.05, categories: [], outcome: "ok" }),
    ev({ created_at: "2026-10-30T20:00:00Z", cost_usd: 0.02 }),
  ];
  const r = buildReport(events, [{ id: "s1", slug: "jane", name: "Jane", ai_daily_edit_limit: null }], DEFAULT_SETTINGS, now);
  assert.equal(r.kpis.editsToday, 2); // the limit block didn't reach the model
  assert.equal(Number(r.kpis.todayCost.toFixed(3)), 0.07);
  assert.equal(Number(r.kpis.cost7.toFixed(3)), 0.09);
  assert.equal(r.daily.length, 30);
  assert.equal(r.daily.at(-1)?.day, "2026-11-02");
  assert.equal(r.byCategory.find((c) => c.category === "copy")?.applied, 2);
  assert.equal(r.topSites[0].blockedToday, 1);
  assert.equal(r.topSites[0].limit, 30);
});
