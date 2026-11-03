"use client";
import { useState } from "react";

type Step = { name: string; ok: boolean; detail: string; ms?: number };

export function AiCheck() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ model: string; steps: Step[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">AI connection</h2>
          <p className="text-sm text-stone-500">Checks your API key, model and the edit format with a couple of tiny requests (well under a cent).</p>
        </div>
        <button className="btn" disabled={busy} onClick={async () => {
          setBusy(true); setError(null);
          const res = await fetch("/api/admin/ai-check", { method: "POST" });
          const data = await res.json().catch(() => null);
          setBusy(false);
          if (!res.ok || !data) setError(data?.error ?? `Check failed (${res.status})`); else setResult(data);
        }}>{busy ? "Testing…" : "Test AI connection"}</button>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {result && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-xs text-stone-500">Model: <span className="font-mono">{result.model}</span></p>
          {result.steps.map((s) => (
            <div key={s.name} className={`flex gap-3 rounded-lg p-3 ${s.ok ? "bg-emerald-50" : "bg-red-50"}`}>
              <span aria-hidden className={s.ok ? "text-emerald-700" : "text-red-700"}>{s.ok ? "✓" : "✕"}</span>
              <div>
                <p className="font-medium">{s.name}{s.ms !== undefined && <span className="ml-2 text-xs font-normal text-stone-500">{(s.ms / 1000).toFixed(1)}s</span>}</p>
                <p className={s.ok ? "text-stone-600" : "text-red-800"}>{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
