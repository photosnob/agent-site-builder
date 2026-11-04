"use client";
import { useState } from "react";

type Step = { step: string; ok: boolean; status?: number; ms: number; note?: string };
type Result = { scraperConfigured: boolean; steps: Step[]; bytes: number; found: null | { headshots: string[]; listings: number; idxWidget: boolean; textChars: number; textSample: string } };

export function ScanCheck() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">Test site scan</h2>
      <p className="text-sm text-stone-500">Shows each step the importer takes for a URL (direct request, then each scraping tier) and what it would find.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input className="input min-w-64 flex-1" placeholder="https://agent-site.com/about" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className="input w-48" placeholder="Agent name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" disabled={busy || !url} onClick={async () => {
          setBusy(true); setError(null); setR(null);
          const res = await fetch("/api/admin/scan-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, agentName: name || undefined }) });
          const data = await res.json().catch(() => null);
          setBusy(false);
          if (!res.ok || !data) setError(data?.error ?? `Failed (${res.status})`); else setR(data);
        }}>{busy ? "Scanning… (up to a minute)" : "Run scan test"}</button>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {r && (
        <div className="mt-4 space-y-2 text-sm">
          {!r.scraperConfigured && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">SCRAPINGBEE_API_KEY isn&apos;t set on this deployment, so blocked sites can&apos;t be retried. Add it in Vercel, then redeploy.</p>}
          {r.steps.map((s, i) => (
            <div key={i} className={`flex gap-3 rounded-lg p-3 ${s.ok ? "bg-emerald-50" : "bg-red-50"}`}>
              <span aria-hidden className={s.ok ? "text-emerald-700" : "text-red-700"}>{s.ok ? "✓" : "✕"}</span>
              <div className="min-w-0">
                <p className="font-medium">{s.step}{s.status ? ` · ${s.status}` : ""}<span className="ml-2 text-xs font-normal text-stone-500">{(s.ms / 1000).toFixed(1)}s</span></p>
                {s.note && <p className="break-words text-xs text-red-800">{s.note}</p>}
              </div>
            </div>
          ))}
          {r.found && (
            <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-700">
              <p><strong>Page size:</strong> {(r.bytes / 1024).toFixed(0)} KB · <strong>Readable text:</strong> {r.found.textChars.toLocaleString()} chars · <strong>Listings:</strong> {r.found.listings}{r.found.idxWidget ? " (IDX widget detected)" : ""}</p>
              <p className="mt-1"><strong>Headshot candidates:</strong> {r.found.headshots.length ? "" : "none"}</p>
              <div className="mt-1 flex gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.found.headshots.map((u) => <img key={u} src={u} alt="" className="h-16 w-16 rounded object-cover" referrerPolicy="no-referrer" />)}
              </div>
              <p className="mt-2 text-stone-500">“{r.found.textSample}…”</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
