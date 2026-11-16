"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminUserRow } from "@/lib/adminUsers";

const STEP: Record<number, string> = { 1: "Profile", 2: "Market", 3: "Import", 4: "Design", 5: "Building", 6: "Done" };
type Filter = "all" | "live" | "draft" | "onboarding" | "nosite";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d} days ago` : fmt(iso);
};
const stage = (r: AdminUserRow): Filter => (!r.site ? "nosite" : r.site.status === "live" ? "live" : r.site.step < 6 ? "onboarding" : "draft");

export function AdminUsers({ rows }: { rows: AdminUserRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, live: 0, draft: 0, onboarding: 0, nosite: 0 };
    for (const r of rows) c[stage(r)]++;
    return c;
  }, [rows]);
  const week = rows.filter((r) => Date.now() - new Date(r.signedUpAt).getTime() < 7 * 86_400_000).length;
  const shown = rows.filter((r) => {
    if (filter !== "all" && stage(r) !== filter) return false;
    const s = q.trim().toLowerCase();
    return !s || [r.email, r.site?.name, r.site?.brokerage, r.site?.market, r.site?.slug].some((v) => v?.toLowerCase().includes(s));
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-bold">Users</h1>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Sign-ups", counts.all], ["This week", week], ["Finished onboarding", counts.live + counts.draft], ["Live sites", counts.live]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-stone-200 bg-white p-4"><dt className="text-xs text-stone-500">{l}</dt><dd className="mt-1 text-2xl font-bold">{v}</dd></div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search name, email, brokerage, area…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        {([["all", "All"], ["live", "Live"], ["draft", "Built, not live"], ["onboarding", "In onboarding"], ["nosite", "No site"]] as [Filter, string][]).map(([f, l]) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-full px-3 py-1.5 text-sm ${filter === f ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}>{l} <span className="opacity-60">{counts[f]}</span></button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Signed up</th>
              <th className="px-4 py-3 font-medium">Last seen</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 text-right font-medium">Listings</th>
              <th className="px-4 py-3 text-right font-medium">Leads</th>
              <th className="px-4 py-3 text-right font-medium">AI edits 30d</th>
              <th className="px-4 py-3 font-medium">Site</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {shown.map((r) => {
              const s = r.site;
              const st = stage(r);
              return (
                <tr key={r.userId} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${r.userId}`} className="font-semibold hover:underline">{s?.name ?? r.email}</Link>
                    <p className="text-xs text-stone-500">{s ? r.email : ""}{!r.confirmed && <span className={s ? "ml-1 text-amber-700" : "text-amber-700"}>(unconfirmed)</span>}</p>
                    {(s?.brokerage || s?.market) && <p className="text-xs text-stone-400">{[s.brokerage, s.market].filter(Boolean).join(" · ")}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{fmt(r.signedUpAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-stone-600">{ago(r.lastSignInAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st === "live" ? "bg-emerald-50 text-emerald-800" : st === "draft" ? "bg-sky-50 text-sky-800" : st === "onboarding" ? "bg-amber-50 text-amber-800" : "bg-stone-100 text-stone-600"}`}>
                      {st === "live" ? "Live" : st === "draft" ? "Built, not live" : st === "onboarding" ? `Onboarding: ${STEP[s!.step] ?? s!.step}` : "No site"}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{s?.template ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s?.listings ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s?.leads ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s ? `${s.aiEdits30d}${s.aiCost30d ? ` · $${s.aiCost30d.toFixed(2)}` : ""}` : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {s && s.step >= 6 && <Link href={`/admin/users/${r.userId}`} className="mr-3 underline">Preview</Link>}
                    {s?.status === "live" && <a href={s.liveUrl} target="_blank" rel="noreferrer" className="underline">Live ↗</a>}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-stone-500">No users match.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
