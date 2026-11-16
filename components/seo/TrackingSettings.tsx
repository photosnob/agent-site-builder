"use client";
import { useState } from "react";
import { TRACKERS, TRACKER_KEYS, extractTrackerId, type SiteTracking, type TrackerKey } from "@/lib/tracking";

/** Analytics and ad tags for the agent's site, entered as IDs (or pasted snippets). */
export function TrackingSettings({ siteId, initial }: { siteId: string; initial: SiteTracking }) {
  const [vals, setVals] = useState<Record<TrackerKey, string>>(Object.fromEntries(TRACKER_KEYS.map((k) => [k, initial[k] ?? ""])) as Record<TrackerKey, string>);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = TRACKER_KEYS.some((k) => (vals[k] || "") !== (saved[k] ?? ""));

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/sites/${siteId}/tracking`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(vals) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: data.error ?? "Couldn't save" }); return; }
    const t = data.tracking as SiteTracking;
    setSaved(t);
    setVals(Object.fromEntries(TRACKER_KEYS.map((k) => [k, t[k] ?? ""])) as Record<TrackerKey, string>);
    setMsg({ ok: true, text: "Saved. Your tags are live on every page of your site." });
  }

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Tracking &amp; analytics</h2>
        <p className="mt-1 text-sm text-stone-500">Connect your own analytics and ad accounts. Paste the ID, or the whole code snippet the service gave you and we&apos;ll pull the ID out. Tags run on every page of your public site, not in previews.</p>
      </div>
      <div className="space-y-3">
        {TRACKER_KEYS.map((k) => {
          const v = vals[k];
          const looksOk = !v || TRACKERS[k].re.test(extractTrackerId(k, v));
          return (
            <div key={k}>
              <label htmlFor={`trk-${k}`} className="label">{TRACKERS[k].label}{saved[k] && <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">Active</span>}</label>
              <input id={`trk-${k}`} className="input font-mono text-sm" placeholder={TRACKERS[k].hint} value={v} spellCheck={false} autoComplete="off"
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })} aria-invalid={!looksOk} />
              {v && !looksOk && <p className="mt-1 text-xs text-red-700">That doesn&apos;t look like a {TRACKERS[k].label} ID ({TRACKERS[k].hint}).</p>}
              {v && looksOk && extractTrackerId(k, v) !== v.trim() && <p className="mt-1 text-xs text-stone-500">We&apos;ll save {extractTrackerId(k, v)}.</p>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-500">If you use Tag Manager, add your other tags inside it rather than here, so nothing is counted twice. Analytics and ad cookies may require a cookie notice where you do business.</p>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save tracking"}</button>
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
