"use client";
import { useState } from "react";
import type { Testimonial } from "@/lib/siteData";
import { Field, PageShell, apiJson, useReorder, useStatus } from "./shared";

const SOURCES = [["manual", "Typed in"], ["google", "Google"], ["zillow", "Zillow"], ["yelp", "Yelp"], ["imported", "From my old site"], ["other", "Other"]] as const;
type Draft = { quote: string; author: string; context: string; rating: number | null; source: Testimonial["source"] };
const EMPTY: Draft = { quote: "", author: "", context: "", rating: 5, source: "manual" };

export function ReviewsManager({ siteId, initial }: { siteId: string; initial: Testimonial[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const { busy, run, view } = useStatus();
  const base = `/api/sites/${siteId}/reviews`;
  const move = useReorder((id) => `${base}/${id}`, items, setItems);
  const patch = (t: Testimonial, body: Partial<Testimonial>) => run("patch", async () => {
    const { item } = await apiJson(`${base}/${t.id}`, "PATCH", body);
    setItems(items.map((x) => (x.id === t.id ? item : x)));
  });
  const featuredCount = items.filter((t) => t.featured && t.visible).length;

  return (
    <PageShell title="Reviews" intro="Curate the client reviews on your site. Starred reviews appear on your home page; every visible review appears on your Success Stories page. Only post real reviews, quoted as written."
      action={!editing && <button className="btn" onClick={() => setEditing({ id: null, draft: EMPTY })}>Add review</button>}>
      {view}
      {editing && (
        <div className="mb-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <Field label="Review"><textarea className="input" rows={4} maxLength={1500} value={editing.draft.quote} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, quote: e.target.value } })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name as shown"><input className="input" maxLength={80} value={editing.draft.author} placeholder="Maria G." onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, author: e.target.value } })} /></Field>
            <Field label="Context (optional)"><input className="input" maxLength={120} value={editing.draft.context} placeholder="Sold in Oro Valley" onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, context: e.target.value } })} /></Field>
            <Field label="Rating (optional)">
              <select className="input" value={editing.draft.rating ?? ""} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, rating: e.target.value ? Number(e.target.value) : null } })}>
                <option value="">No stars</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select className="input" value={editing.draft.source} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, source: e.target.value as Draft["source"] } })}>
                {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex gap-2">
            <button className="btn" disabled={busy === "save"} onClick={() => run("save", async () => {
              const d = editing.draft;
              const body = { quote: d.quote, author: d.author, context: d.context, rating: d.rating, source: d.source };
              const { item } = editing.id ? await apiJson(`${base}/${editing.id}`, "PATCH", body) : await apiJson(base, "POST", body);
              setItems(editing.id ? items.map((x) => (x.id === item.id ? item : x)) : [item, ...items]);
              setEditing(null);
            }, "Saved.")}>{busy === "save" ? "Saving…" : "Save review"}</button>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <p className="mb-3 text-xs text-stone-500">{items.filter((t) => t.visible).length} visible · {featuredCount} starred for the home page{featuredCount === 0 && items.length ? " (the newest visible reviews are used until you star some)" : ""}</p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">No reviews yet. Add a few from Google, Zillow or past clients.</div>
      ) : (
        <div className="space-y-3">
          {items.map((t, i) => (
            <div key={t.id} className={`rounded-xl border bg-white p-4 ${t.visible ? "border-stone-200" : "border-dashed border-stone-300 opacity-60"}`}>
              <div className="flex items-start gap-3">
                <button aria-label={t.featured ? "Unstar" : "Star for home page"} title={t.featured ? "Shown on home page" : "Show on home page"} className={`text-xl leading-none ${t.featured ? "text-amber-500" : "text-stone-300 hover:text-stone-500"}`} onClick={() => patch(t, { featured: !t.featured })}>★</button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">“{t.quote}”</p>
                  <p className="mt-1 text-xs text-stone-500">{[t.author, t.context, t.rating && "★".repeat(t.rating), SOURCES.find(([v]) => v === t.source)?.[1]].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <button className="btn-ghost !px-2 !py-1" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button className="btn-ghost !px-2 !py-1" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                  <button className="btn-ghost !py-1" onClick={() => patch(t, { visible: !t.visible })}>{t.visible ? "Hide" : "Show"}</button>
                  <button className="btn-ghost !py-1" onClick={() => setEditing({ id: t.id, draft: { quote: t.quote, author: t.author, context: t.context ?? "", rating: t.rating, source: t.source as Draft["source"] } })}>Edit</button>
                  <button className="btn-ghost !py-1 text-red-700" onClick={() => confirm("Delete this review?") && run("del", async () => { await apiJson(`${base}/${t.id}`, "DELETE"); setItems(items.filter((x) => x.id !== t.id)); })}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
