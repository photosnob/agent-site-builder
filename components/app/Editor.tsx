"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Finding } from "@/lib/guardrails/fairHousing";
import { DashNav } from "./DashNav";
import { HeroPanel, type HeroState } from "./HeroPanel";
import { TemplatePanel } from "./TemplatePanel";
import type { TemplateId } from "@/lib/templates";

type PageRef = { id: string; slug: string; title: string; enabled: boolean };

type Rev = { id: string; status: string; source: string; prompt: string | null; created_at: string };
type Lead = { id: string; name: string; email: string | null; phone: string | null; intent: string | null; message: string | null; created_at: string };
type Proposal = { revisionId: string | null; ok: boolean; summary: string; errors: string[]; warnings: Finding[] };

const SUGGESTIONS = [
  "Make the hero headline mention Eichlers and mid-century homes",
  "Move featured listings above the about section",
  "Switch to the darker color palette",
  "Shorten my bio to two paragraphs",
  "Add a section about selling with a home valuation offer",
];

export function Editor(props: {
  siteId: string; slug: string; status: string; liveUrl: string; publishedAt: string | null;
  aiReady: boolean; revisions: Rev[]; leads: Lead[]; editsLeft: number; editsLimit: number;
  pages: PageRef[];
  template: TemplateId | null;
  hero: HeroState;
  assets: { id: string; url: string; kind: string; meta: { type?: string } }[];
}) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "history" | "leads">("edit");
  const [previewKey, setPreviewKey] = useState(0);
  const [editsLeft, setEditsLeft] = useState(props.editsLeft);
  const [pageId, setPageId] = useState<string | null>(null);
  const [heroOpen, setHeroOpen] = useState(0);
  const page = props.pages.find((p) => p.id === pageId) ?? null;

  const base = `/api/sites/${props.siteId}`;
  const qs = new URLSearchParams({ ...(page ? { page: page.slug } : {}), ...(proposal?.revisionId ? { rev: proposal.revisionId } : {}) }).toString();
  const previewSrc = `/preview/${props.siteId}${qs ? `?${qs}` : ""}`;

  async function call(label: string, path: string, body?: unknown) {
    setBusy(label); setError(null);
    try {
      const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
      const data = await res.json();
      if (typeof data.remainingToday === "number") setEditsLeft(data.remainingToday);
      if (!res.ok) throw new Error([data.error || "Something went wrong", data.detail && `Admin detail: ${data.detail}`].filter(Boolean).join("\n"));
      return data;
    } catch (e) { setError((e as Error).message); return null; } finally { setBusy(null); }
  }

  async function propose() {
    const data = await call("propose", `${base}/edit`, { prompt, pageId });
    if (data) { setProposal(data); setAck(false); setPreviewKey((k) => k + 1); }
  }
  async function resolve(action: "apply" | "discard") {
    if (!proposal?.revisionId) { setProposal(null); return; }
    const data = await call(action, `${base}/revisions/${proposal.revisionId}`, { action, acknowledgeWarnings: ack });
    if (data) { setProposal(null); setPrompt(""); setPreviewKey((k) => k + 1); router.refresh(); }
  }

  return (
    <div className="flex h-screen flex-col">
      <DashNav active="/dashboard" liveUrl={props.status === "live" ? props.liveUrl : null} right={<>
        <button className="btn-ghost" disabled={!!busy} onClick={async () => { if (await call("undo", `${base}/undo`, { pageId })) { setPreviewKey((k) => k + 1); router.refresh(); } }}>Undo</button>
        <button className="btn" disabled={!!busy || !!proposal} onClick={async () => { if (await call("publish", `${base}/publish`)) router.refresh(); }}>
          {busy === "publish" ? "Publishing…" : props.status === "live" ? "Publish changes" : "Publish site"}
        </button>
      </>} />

      <div className="grid min-h-0 flex-1 md:grid-cols-[380px_1fr]">
        <aside className="flex min-h-0 flex-col border-r border-stone-200 bg-white">
          <nav className="flex border-b border-stone-200 text-sm">
            {(["edit", "history", "leads"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 capitalize ${tab === t ? "border-b-2 border-stone-900 font-semibold" : "text-stone-500"}`}>
                {t}{t === "leads" && props.leads.length ? ` (${props.leads.length})` : ""}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {error && <p className="mb-3 whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <PagePicker pages={props.pages} value={pageId} disabled={!!proposal || !!busy} siteId={props.siteId}
              onChange={(id) => { setPageId(id); setPreviewKey((k) => k + 1); }} onChanged={() => router.refresh()} />
            {!pageId && tab === "edit" && <TemplatePanel siteId={props.siteId} current={props.template} onSwitched={() => { setPreviewKey((k) => k + 1); router.refresh(); }} />}
            {!pageId && tab === "edit" && <HeroPanel key={`${props.template}-${props.hero.style}`} siteId={props.siteId} initial={props.hero} assets={props.assets} openSignal={heroOpen} onSaved={() => { setPreviewKey((k) => k + 1); router.refresh(); }} />}

            {tab === "edit" && (
              <div className="space-y-4">
                {!props.aiReady && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Set ANTHROPIC_API_KEY to enable prompt edits.</p>}
                <label className="label" htmlFor="prompt">What would you like to change?</label>
                <textarea id="prompt" className="input" rows={4} maxLength={1000} value={prompt} disabled={!!proposal}
                  placeholder="e.g. Make the headline warmer and mention Willow Glen" onChange={(e) => setPrompt(e.target.value)} />
                <button className="btn w-full" disabled={!props.aiReady || !!busy || !!proposal || editsLeft <= 0 || prompt.trim().length < 3} onClick={propose}>
                  {busy === "propose" ? "Working on it…" : "Preview change"}
                </button>
                <p className={`text-xs ${editsLeft <= 3 ? "text-amber-700" : "text-stone-400"}`}>
                  {editsLeft > 0 ? `${editsLeft} of ${props.editsLimit} AI edits left today` : "You've used today's AI edits. They reset at midnight."}
                </p>
                {!proposal && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Try</p>
                    {SUGGESTIONS.map((s) => (
                      <button key={s} className="block w-full rounded-lg bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100" onClick={() => setPrompt(s)}>{s}</button>
                    ))}
                  </div>
                )}

                {proposal && (
                  <div className="space-y-3 rounded-xl border border-stone-200 p-4">
                    <p className="text-sm">{proposal.summary}</p>
                    {proposal.errors.length > 0 && (
                      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                        <p className="font-semibold">This change can&apos;t be made:</p>
                        <ul className="mt-1 list-disc pl-4">{proposal.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                        {!pageId && /hero/i.test([proposal.summary, ...proposal.errors].join(" ")) && /photo|image|video|library/i.test([proposal.summary, ...proposal.errors].join(" ")) && (
                          <button className="mt-3 rounded-md bg-white px-3 py-1.5 font-semibold text-stone-900 shadow-sm ring-1 ring-red-200 hover:bg-red-100" onClick={() => setHeroOpen((n) => n + 1)}>Upload or pick a hero photo ↑</button>
                        )}
                      </div>
                    )}
                    {proposal.warnings.length > 0 && (
                      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="font-semibold">Please review:</p>
                        <ul className="mt-1 list-disc pl-4">{proposal.warnings.map((w) => <li key={w.rule + w.match}>{w.message}</li>)}</ul>
                        <label className="mt-2 flex items-center gap-2 font-medium"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I&apos;ve reviewed these and they&apos;re accurate</label>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button className="btn-ghost flex-1" disabled={!!busy} onClick={() => resolve("discard")}>Discard</button>
                      {proposal.ok && (
                        <button className="btn flex-1" disabled={!!busy || (proposal.warnings.length > 0 && !ack)} onClick={() => resolve("apply")}>Apply</button>
                      )}
                    </div>
                    {proposal.ok && <p className="text-xs text-stone-500">The preview on the right shows this change. It&apos;s not live until you publish.</p>}
                  </div>
                )}
              </div>
            )}

            {tab === "history" && (
              <ul className="space-y-2 text-sm">
                {props.revisions.map((r) => (
                  <li key={r.id} className="rounded-lg border border-stone-100 p-3">
                    <p className="font-medium">{r.source === "generate" ? "Site generated" : r.prompt ?? r.source}</p>
                    <p className="text-xs text-stone-500">{new Date(r.created_at).toLocaleString()} · {r.status}</p>
                  </li>
                ))}
              </ul>
            )}

            {tab === "leads" && (
              props.leads.length === 0 ? <p className="text-sm text-stone-500">No leads yet. Publish your site and share the link.</p> : (
                <ul className="space-y-2 text-sm">
                  {props.leads.map((l) => (
                    <li key={l.id} className="rounded-lg border border-stone-100 p-3">
                      <p className="font-medium">{l.name} <span className="text-xs text-stone-500">· {l.intent}</span></p>
                      <p className="text-stone-600">{l.email} {l.phone && `· ${l.phone}`}</p>
                      {l.message && <p className="mt-1 text-stone-600">{l.message}</p>}
                      <p className="mt-1 text-xs text-stone-400">{new Date(l.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </aside>
        <div className="min-h-0 bg-stone-100 p-3">
          <iframe key={`${previewKey}-${proposal?.revisionId ?? "draft"}`} ref={frame} src={previewSrc} title="Site preview" className="h-full w-full rounded-lg border border-stone-200 bg-white" />
        </div>
      </div>
    </div>
  );
}

function PagePicker({ pages, value, onChange, disabled, siteId, onChanged }: {
  pages: PageRef[]; value: string | null; onChange: (id: string | null) => void; disabled: boolean; siteId: string; onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const current = pages.find((p) => p.id === value);
  return (
    <div className="mb-4 rounded-lg border border-stone-200 p-3">
      <label className="label" htmlFor="page-picker">Editing</label>
      <select id="page-picker" className="input" disabled={disabled} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Home page</option>
        {pages.map((p) => <option key={p.id} value={p.id}>{p.title}{p.enabled ? "" : " (hidden)"}</option>)}
      </select>
      {current && (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={current.enabled} disabled={busy} onChange={async (e) => {
            setBusy(true);
            await fetch(`/api/sites/${siteId}/pages/${current.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: e.target.checked }) });
            setBusy(false); onChanged();
          }} />
          Show this page in the menu
        </label>
      )}
      {pages.length === 0 && (
        <div className="mt-2 text-sm">
          <p className="text-stone-500">Add Buy, Sell, Team and Success Stories pages, written for you.</p>
          <button className="btn-ghost mt-2 w-full" disabled={busy} onClick={async () => {
            setBusy(true); setErr(null);
            const res = await fetch(`/api/sites/${siteId}/pages`, { method: "POST" });
            const data = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) setErr(data.error ?? "Couldn't create pages"); else onChanged();
          }}>{busy ? "Writing pages… (about 30s)" : "Add default pages"}</button>
          {err && <p className="mt-2 text-red-700">{err}</p>}
        </div>
      )}
    </div>
  );
}
