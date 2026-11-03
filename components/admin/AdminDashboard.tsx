"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABEL, FEATURES, FEATURE_LABEL, type Report } from "@/lib/ai/report";
import type { AiSettings } from "@/lib/ai/usageShared";
import { AiCheck } from "./AiCheck";

// Categorical slots in fixed order (validated for colorblind separation).
const SERIES_COLOR: Record<(typeof FEATURES)[number], string> = { edit: "#2a78d6", generate: "#eb6834", import_extract: "#1baf7a" };

const usd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(4)}` : n < 10 ? `$${n.toFixed(2)}` : `$${n.toFixed(0)}`);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const tokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : String(n));
const shortDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const OUTCOME: Record<string, { label: string; cls: string }> = {
  applied: { label: "Applied", cls: "bg-emerald-100 text-emerald-800" },
  proposed: { label: "Previewed", cls: "bg-stone-100 text-stone-700" },
  discarded: { label: "Discarded", cls: "bg-stone-100 text-stone-500" },
  rejected: { label: "Blocked by guardrail", cls: "bg-amber-100 text-amber-800" },
  refused: { label: "Out of scope", cls: "bg-amber-100 text-amber-800" },
  error: { label: "Error", cls: "bg-red-100 text-red-700" },
  blocked_limit: { label: "Over daily limit", cls: "bg-red-100 text-red-700" },
};

export function AdminDashboard({ report, settings, model }: { report: Report; settings: AiSettings; model: string }) {
  const k = report.kpis;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Admin</p>
          <h1 className="mt-1 text-3xl font-bold">AI usage</h1>
          <p className="mt-1 text-sm text-stone-500">Model {model} · days in {settings.timezone} · costs are estimates from the rates below</p>
        </div>
        <a href="/dashboard" className="btn-ghost">Back to app</a>
      </div>

      <AiCheck />

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Spent today" value={usd(k.todayCost)} sub={`${pct(Math.min(k.capPct, 9.99))} of ${usd(settings.globalDailySpendUsd)} daily cap`} warn={k.capPct >= 0.8} />
        <Tile label="Last 7 days" value={usd(k.cost7)} sub={`≈ ${usd(k.projectedMonthly)} / month at this pace`} />
        <Tile label="Edits today" value={String(k.editsToday)} sub={`from ${k.agentsToday} agent${k.agentsToday === 1 ? "" : "s"}`} />
        <Tile label="Avg cost per edit" value={usd(k.avgCostPerEdit7)} sub={`${pct(k.applyRate7)} applied · ${pct(k.refusalRate7)} out of scope (7d)`} />
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Daily cost, last 30 days</h2>
        <DailyChart daily={report.daily} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">What agents ask for <span className="font-normal text-stone-400">(30 days)</span></h2>
          {report.byCategory.length === 0 ? <Empty /> : (
            <table className="mt-3 w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-stone-400"><th className="py-2 font-medium">Type</th><th className="text-right font-medium">Edits</th><th className="text-right font-medium">Applied</th><th className="text-right font-medium">Blocked</th><th className="text-right font-medium">Cost</th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {report.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td className="py-2">{CATEGORY_LABEL[c.category] ?? c.category}</td>
                    <td className="text-right tabular-nums">{c.edits}</td>
                    <td className="text-right tabular-nums">{pct(c.edits ? c.applied / c.edits : 0)}</td>
                    <td className="text-right tabular-nums">{c.refused + c.rejected}</td>
                    <td className="text-right tabular-nums">{usd(c.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">Cost by feature <span className="font-normal text-stone-400">(30 days)</span></h2>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-stone-400"><th className="py-2 font-medium">Feature</th><th className="text-right font-medium">Calls</th><th className="text-right font-medium">Tokens in / out</th><th className="text-right font-medium">Errors</th><th className="text-right font-medium">Cost</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {report.byFeature.map((f) => (
                <tr key={f.feature}>
                  <td className="py-2"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: SERIES_COLOR[f.feature] }} />{FEATURE_LABEL[f.feature]}</td>
                  <td className="text-right tabular-nums">{f.calls}</td>
                  <td className="text-right tabular-nums">{tokens(f.inputTokens)} / {tokens(f.outputTokens)}</td>
                  <td className="text-right tabular-nums">{f.errors}</td>
                  <td className="text-right tabular-nums">{usd(f.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Agents <span className="font-normal text-stone-400">(30 days, by cost)</span></h2>
        {report.topSites.length === 0 ? <Empty /> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-stone-400"><th className="py-2 font-medium">Agent</th><th className="text-right font-medium">Edits</th><th className="text-right font-medium">Today</th><th className="text-right font-medium">Cost</th><th className="pl-6 font-medium">Daily edit limit</th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {report.topSites.map((s) => (
                  <tr key={s.siteId}>
                    <td className="py-2"><p className="font-medium">{s.name}</p><p className="text-xs text-stone-400">{s.slug}</p></td>
                    <td className="text-right tabular-nums">{s.edits}</td>
                    <td className="text-right tabular-nums">
                      {s.editsToday}/{s.limit}
                      {s.blockedToday > 0 && <span className="ml-1 rounded bg-red-100 px-1 text-xs text-red-700">hit limit</span>}
                    </td>
                    <td className="text-right tabular-nums">{usd(s.cost)}</td>
                    <td className="pl-6"><SiteLimit siteId={s.siteId} override={s.override} fallback={settings.defaultDailyEditsPerSite} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Recent prompts</h2>
        {report.recent.length === 0 ? <Empty /> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-stone-400"><th className="py-2 font-medium">When</th><th className="font-medium">Agent</th><th className="font-medium">Prompt</th><th className="font-medium">Type</th><th className="font-medium">Result</th><th className="text-right font-medium">Tokens</th><th className="text-right font-medium">Cost</th></tr></thead>
              <tbody className="divide-y divide-stone-100 align-top">
                {report.recent.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-stone-500">{new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: settings.timezone })}</td>
                    <td className="pr-3">{e.siteName}</td>
                    <td className="max-w-sm pr-3">{e.prompt}</td>
                    <td className="pr-3 text-xs text-stone-600">{e.categories.map((c) => CATEGORY_LABEL[c] ?? c).join(", ") || "—"}</td>
                    <td className="pr-3">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME[e.outcome]?.cls ?? "bg-stone-100"}`}>{OUTCOME[e.outcome]?.label ?? e.outcome}</span>
                      {e.error && <p className="mt-1 max-w-xs text-xs text-red-700">{e.error}</p>}
                    </td>
                    <td className="whitespace-nowrap text-right text-xs tabular-nums text-stone-500">{tokens(e.input_tokens)} / {tokens(e.output_tokens)}</td>
                    <td className="text-right tabular-nums">{usd(e.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SettingsForm settings={settings} />
    </main>
  );
}

function Tile({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${warn ? "border-amber-300" : "border-stone-200"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      <p className={`mt-1 text-xs ${warn ? "text-amber-700" : "text-stone-500"}`}>{warn && "⚠ "}{sub}</p>
    </div>
  );
}
const Empty = () => <p className="mt-3 text-sm text-stone-400">No activity yet.</p>;

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v)!;
}

function DailyChart({ daily }: { daily: Report["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...daily.map((d) => d.total)));
  const H = 180;
  const ticks = [0, max / 2, max];
  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-stone-600" aria-label="Legend">
        {FEATURES.map((f) => (
          <span key={f} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_COLOR[f] }} />{FEATURE_LABEL[f]}</span>
        ))}
      </div>
      <div className="relative flex" style={{ height: H + 22 }}>
        <div className="relative w-12 shrink-0 text-right text-[11px] tabular-nums text-stone-400" style={{ height: H }}>
          {ticks.map((t) => <span key={t} className="absolute right-2 -translate-y-1/2" style={{ top: H - (t / max) * H }}>{usd(t)}</span>)}
        </div>
        <div className="relative flex-1" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-stone-100" style={{ top: H - (t / max) * H }} />)}
          <div className="absolute inset-x-0 top-0 flex items-end gap-[2px]" style={{ height: H }}>
            {daily.map((d, i) => (
              <div key={d.day} className="relative flex h-full flex-1 cursor-default flex-col justify-end" onMouseEnter={() => setHover(i)}
                role="img" aria-label={`${shortDay(d.day)}: ${usd(d.total)}`}>
                <div className={`flex flex-col-reverse gap-[2px] ${hover !== null && hover !== i ? "opacity-50" : ""}`}>
                  {FEATURES.filter((f) => d[f] > 0).map((f, j, arr) => (
                    <div key={f} style={{ height: Math.max(2, (d[f] / max) * H - 2), background: SERIES_COLOR[f], borderRadius: j === arr.length - 1 ? "4px 4px 0 0" : 0 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 flex text-[11px] text-stone-400" style={{ top: H + 6 }}>
            {daily.map((d, i) => <span key={d.day} className="flex-1 whitespace-nowrap text-center">{(daily.length - 1 - i) % 7 === 0 ? shortDay(d.day) : ""}</span>)}
          </div>
          {hover !== null && (
            <div className="pointer-events-none absolute z-10 w-48 rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-lg"
              style={{ left: `clamp(0px, calc(${((hover + 0.5) / daily.length) * 100}% - 96px), calc(100% - 192px))`, top: 0 }}>
              <p className="font-semibold text-stone-900">{shortDay(daily[hover].day)}</p>
              {FEATURES.map((f) => (
                <p key={f} className="mt-1 flex items-center justify-between text-stone-600">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: SERIES_COLOR[f] }} />{FEATURE_LABEL[f]}</span>
                  <span className="tabular-nums text-stone-900">{usd(daily[hover][f])}</span>
                </p>
              ))}
              <p className="mt-1.5 flex justify-between border-t border-stone-100 pt-1.5 font-semibold text-stone-900"><span>Total · {daily[hover].calls} calls</span><span className="tabular-nums">{usd(daily[hover].total)}</span></p>
            </div>
          )}
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-stone-500">View as table</summary>
        <table className="mt-2 w-full text-xs">
          <thead><tr className="text-left text-stone-400"><th className="py-1 font-medium">Day</th>{FEATURES.map((f) => <th key={f} className="text-right font-medium">{FEATURE_LABEL[f]}</th>)}<th className="text-right font-medium">Total</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {[...daily].reverse().map((d) => (
              <tr key={d.day}><td className="py-1">{shortDay(d.day)}</td>{FEATURES.map((f) => <td key={f} className="text-right tabular-nums">{usd(d[f])}</td>)}<td className="text-right font-medium tabular-nums">{usd(d.total)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function SiteLimit({ siteId, override, fallback }: { siteId: string; override: number | null; fallback: number }) {
  const router = useRouter();
  const [value, setValue] = useState(override?.toString() ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const save = async () => {
    setState("saving");
    const res = await fetch(`/api/admin/sites/${siteId}/limit`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: value.trim() === "" ? null : Number(value) }),
    });
    setState(res.ok ? "saved" : "error");
    if (res.ok) router.refresh();
  };
  return (
    <div className="flex items-center gap-2">
      <input className="input !w-20 !py-1 text-right" inputMode="numeric" placeholder={String(fallback)} value={value}
        onChange={(e) => { setValue(e.target.value.replace(/\D/g, "")); setState("idle"); }} onKeyDown={(e) => e.key === "Enter" && save()} />
      <button className="text-xs font-semibold underline disabled:opacity-40" disabled={state === "saving" || value === (override?.toString() ?? "")} onClick={save}>Save</button>
      <span className="text-xs text-stone-400">{state === "saved" ? "Saved" : state === "error" ? "Error" : override === null ? "default" : ""}</span>
    </div>
  );
}

function SettingsForm({ settings }: { settings: AiSettings }) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const numField = (label: string, value: number, onChange: (n: number) => void, hint?: string, step = "1") => (
    <label className="block text-sm">
      <span className="label">{label}</span>
      <input className="input" type="number" min={0} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
  return (
    <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">Limits &amp; pricing</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {numField("Daily AI edits per agent", s.defaultDailyEditsPerSite, (n) => setS({ ...s, defaultDailyEditsPerSite: n }), "Override per agent in the table above.")}
        {numField("Global daily spend cap ($)", s.globalDailySpendUsd, (n) => setS({ ...s, globalDailySpendUsd: n }), "All AI features pause for the rest of the day when reached. 0 turns AI off.", "0.5")}
        <label className="block text-sm">
          <span className="label">Time zone for &quot;today&quot;</span>
          <input className="input" value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })} />
          <span className="mt-1 block text-xs text-stone-400">Limits reset at midnight here.</span>
        </label>
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-stone-400">Rates per million tokens (USD)</p>
      <div className="mt-2 grid gap-4 md:grid-cols-4">
        {numField("Input", s.pricing.inputPerM, (n) => setS({ ...s, pricing: { ...s.pricing, inputPerM: n } }), undefined, "0.01")}
        {numField("Output", s.pricing.outputPerM, (n) => setS({ ...s, pricing: { ...s.pricing, outputPerM: n } }), undefined, "0.01")}
        {numField("Cache write", s.pricing.cacheWritePerM, (n) => setS({ ...s, pricing: { ...s.pricing, cacheWritePerM: n } }), undefined, "0.01")}
        {numField("Cache read", s.pricing.cacheReadPerM, (n) => setS({ ...s, pricing: { ...s.pricing, cacheReadPerM: n } }), undefined, "0.01")}
      </div>
      <p className="mt-2 text-xs text-stone-400">Check these against Anthropic&apos;s pricing page for your model. New rates apply to calls from now on; past costs keep the rate they were logged with.</p>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn" disabled={busy} onClick={async () => {
          setBusy(true); setMsg(null);
          const res = await fetch("/api/admin/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
          const data = await res.json();
          setBusy(false);
          setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: data.error });
          if (res.ok) router.refresh();
        }}>{busy ? "Saving…" : "Save settings"}</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
