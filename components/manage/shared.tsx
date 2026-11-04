"use client";
import { useState } from "react";

export async function apiJson(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export async function uploadPhoto(siteId: string, file: File, kind: "listing" | "other" = "other"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > 8_000_000) throw new Error("Images must be under 8 MB.");
  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", kind);
  const res = await fetch(`/api/sites/${siteId}/assets`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.asset.url as string;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

/** Up/down reorder: swaps positions with the neighbor and saves both. */
export function useReorder<T extends { id: string; position: number }>(path: (id: string) => string, items: T[], setItems: (x: T[]) => void) {
  return async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    const renumbered = next.map((it, i) => ({ ...it, position: i }));
    setItems(renumbered);
    await Promise.all([renumbered[index], renumbered[j]].map((it) => apiJson(path(it.id), "PATCH", { position: it.position })));
  };
}

export function PageShell({ title, intro, action, children }: { title: string; intro: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">{intro}</p>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </main>
  );
}

export function useStatus() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (label: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(label); setMsg(null);
    try { await fn(); if (ok) setMsg({ ok: true, text: ok }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  };
  const view = msg ? <p className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p> : null;
  return { busy, run, view };
}
