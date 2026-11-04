"use client";
import { useState } from "react";
import type { TeamMember } from "@/lib/siteData";
import { Field, PageShell, apiJson, uploadPhoto, useReorder, useStatus } from "./shared";

type Draft = { name: string; title: string; photo: string | null; bio: string; email: string; phone: string; license: string };
const EMPTY: Draft = { name: "", title: "", photo: null, bio: "", email: "", phone: "", license: "" };

export function TeamManager({ siteId, initial, agentName }: { siteId: string; initial: TeamMember[]; agentName: string }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [uploading, setUploading] = useState(false);
  const { busy, run, view } = useStatus();
  const base = `/api/sites/${siteId}/team`;
  const move = useReorder((id) => `${base}/${id}`, items, setItems);
  const d = editing?.draft;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => editing && setEditing({ ...editing, draft: { ...editing.draft, [k]: v } });

  return (
    <PageShell title="Team" intro={`Shown on your Meet the Team page. ${agentName || "You"} always appear first, using your profile and headshot; add everyone else here.`}
      action={!editing && <button className="btn" onClick={() => setEditing({ id: null, draft: EMPTY })}>Add team member</button>}>
      {view}
      {editing && d && (
        <div className="mb-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {d.photo ? <img src={d.photo} alt="" className="h-24 w-20 rounded-lg object-cover" /> : <div className="flex h-24 w-20 items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-400">Photo</div>}
            <label className="btn-ghost cursor-pointer">{uploading ? "Uploading…" : d.photo ? "Replace photo" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
                setUploading(true);
                try { set("photo", await uploadPhoto(siteId, f)); } catch (err) { alert((err as Error).message); } finally { setUploading(false); }
              }} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input className="input" value={d.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Title"><input className="input" value={d.title} placeholder="Buyer's Agent" onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="Email"><input className="input" type="email" value={d.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone"><input className="input" value={d.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="License (optional)" hint="e.g. AZ #SA123456"><input className="input" value={d.license} onChange={(e) => set("license", e.target.value)} /></Field>
          </div>
          <Field label="Short bio"><textarea className="input" rows={3} maxLength={1500} value={d.bio} onChange={(e) => set("bio", e.target.value)} /></Field>
          <div className="flex gap-2">
            <button className="btn" disabled={busy === "save" || uploading} onClick={() => run("save", async () => {
              const { item } = editing.id ? await apiJson(`${base}/${editing.id}`, "PATCH", d) : await apiJson(base, "POST", d);
              setItems(editing.id ? items.map((x) => (x.id === item.id ? item : x)) : [...items, item]);
              setEditing(null);
            }, "Saved. It's live on your Team page.")}>{busy === "save" ? "Saving…" : "Save"}</button>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">Just you so far. Add agents, assistants or partners.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.photo ? <img src={m.photo} alt="" className="h-16 w-14 rounded-lg object-cover" /> : <div className="h-16 w-14 rounded-lg bg-stone-100" />}
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.name}</p><p className="truncate text-xs text-stone-500">{m.title}</p></div>
              <div className="flex gap-1">
                <button className="btn-ghost !px-2 !py-1" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="btn-ghost !px-2 !py-1" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="btn-ghost !py-1" onClick={() => setEditing({ id: m.id, draft: { name: m.name, title: m.title ?? "", photo: m.photo, bio: m.bio ?? "", email: m.email ?? "", phone: m.phone ?? "", license: m.license ?? "" } })}>Edit</button>
                <button className="btn-ghost !py-1 text-red-700" onClick={() => confirm(`Remove ${m.name}?`) && run("del", async () => { await apiJson(`${base}/${m.id}`, "DELETE"); setItems(items.filter((x) => x.id !== m.id)); })}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
