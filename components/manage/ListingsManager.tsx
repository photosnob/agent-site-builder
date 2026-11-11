"use client";
import { useState } from "react";
import type { Listing } from "@/lib/siteData";
import { Field, PageShell, apiJson, uploadPhoto, useReorder, useStatus } from "./shared";

const STATUS = [["active", "Active"], ["coming-soon", "Coming soon"], ["pending", "Pending"], ["sold", "Sold"]] as const;
type Draft = { address: string; city: string; price: string; status: Listing["status"]; beds: string; baths: string; sqft: string; description: string; photos: string[]; linkUrl: string; featured: boolean };
const EMPTY: Draft = { address: "", city: "", price: "", status: "active", beds: "", baths: "", sqft: "", description: "", photos: [], linkUrl: "", featured: true };
const NEEDS_ADDRESS = "Add the address";
// A listing imported without an address is hidden until one is added; saving with an address shows it again.
const toDraft = (l: Listing): Draft => ({ address: l.address === NEEDS_ADDRESS ? "" : l.address, city: l.city ?? "", price: l.price ?? "", status: l.status, beds: l.beds?.toString() ?? "", baths: l.baths?.toString() ?? "", sqft: l.sqft?.toString() ?? "", description: l.description ?? "", photos: l.photos, linkUrl: l.link_url ?? "", featured: l.address === NEEDS_ADDRESS ? true : l.featured });
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[^\d.]/g, "")));
/** Photos found on a listing page; the picked ones are copied into the library on save. */
type Found = { photos: string[]; picked: string[] };
type Scraped = { sourceUrl: string; draft: { address?: string; city?: string; price?: string; status?: Draft["status"]; beds?: number; baths?: number; sqft?: number; description?: string }; photos: string[]; notes: string[] };
const MAX_PHOTOS = 20;

export function ListingsManager({ siteId, initial }: { siteId: string; initial: Listing[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft; found?: Found; notes?: string[] } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const { busy, run, view } = useStatus();
  const base = `/api/sites/${siteId}/listings`;
  const move = useReorder((id) => `${base}/${id}`, items, setItems);

  const readListing = () => run("read", async () => {
    const r: Scraped = await apiJson(`${base}/scrape`, "POST", { url: importUrl.trim() });
    const d = r.draft;
    setEditing({
      id: null,
      draft: { ...EMPTY, address: d.address ?? "", city: d.city ?? "", price: d.price ?? "", status: d.status ?? "active", beds: d.beds?.toString() ?? "", baths: d.baths?.toString() ?? "", sqft: d.sqft?.toString() ?? "", description: d.description ?? "", linkUrl: r.sourceUrl },
      found: { photos: r.photos, picked: r.photos.slice(0, 12) },
      notes: r.notes,
    });
    setImportOpen(false); setImportUrl("");
  });

  const save = () => run("save", async () => {
    let d = editing!.draft;
    const found = editing!.found;
    // Copy the photos picked from the listing page first, in the order they appear there.
    if (found?.picked.length) {
      const urls = found.photos.filter((u) => found.picked.includes(u)).slice(0, MAX_PHOTOS - d.photos.length);
      const r = await apiJson(`${base}/scrape/photos`, "POST", { urls, address: d.address || undefined });
      if (!r.photos.length) throw new Error("We couldn't copy those photos. Try again, or upload them with + Add photos.");
      d = { ...d, photos: [...d.photos, ...r.photos] };
      setEditing({ ...editing!, draft: d, found: { photos: found.photos.filter((u) => !urls.includes(u)), picked: [] } });
    }
    const body = { address: d.address, city: d.city, price: d.price, status: d.status, beds: num(d.beds), baths: num(d.baths), sqft: num(d.sqft), description: d.description, photos: d.photos, linkUrl: d.linkUrl, featured: d.featured };
    if (!d.photos.length) throw new Error("Add at least one photo; the first one is the cover.");
    const { item } = editing!.id ? await apiJson(`${base}/${editing!.id}`, "PATCH", body) : await apiJson(base, "POST", body);
    setItems(editing!.id ? items.map((x) => (x.id === item.id ? item : x)) : [item, ...items]);
    setEditing(null);
  }, "Saved. It's live on your site now.");

  return (
    <PageShell title="Listings" intro="Add featured properties by hand until your MLS feed is connected. They appear in the Featured listings sections on your home, Buy and Sell pages, and changes go live right away."
      action={!editing && items.length > 0 && (
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setImportOpen((o) => !o)}>Import from a link</button>
          <button className="btn" onClick={() => setEditing({ id: null, draft: EMPTY })}>Add listing</button>
        </div>
      )}>
      {view}
      {importOpen && !editing && items.length > 0 && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-5">
          <p className="font-medium">Import a listing from its web page</p>
          <p className="mt-1 text-sm text-stone-500">Paste the link to one property: your own site, your brokerage&apos;s listing page, or a portal. We&apos;ll fill in the details and find the photos for you to check.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input className="input min-w-64 flex-1" autoFocus placeholder="https://…/1234-elm-street" value={importUrl} onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && importUrl.trim() && !busy) readListing(); }} />
            <button className="btn" disabled={!!busy || !importUrl.trim()} onClick={readListing}>{busy === "read" ? "Reading… (up to a minute)" : "Read listing"}</button>
          </div>
        </div>
      )}
      {editing ? (
        <ListingForm siteId={siteId} draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} busy={busy === "save"}
          found={editing.found} onFoundChange={(found) => setEditing({ ...editing, found })} notes={editing.notes}
          onCancel={() => setEditing(null)} onSave={save} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-8">
          <p className="text-center font-medium">No listings yet. Add your current and recently sold properties.</p>
          <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-5 ring-1 ring-stone-200">
              <p className="font-semibold">Import from a link</p>
              <p className="mt-1 text-sm text-stone-500">Paste a property&apos;s page and we&apos;ll fill in the details and find its photos.</p>
              <input className="input mt-3" placeholder="https://…/1234-elm-street" value={importUrl} onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && importUrl.trim() && !busy) readListing(); }} />
              <button className="btn mt-2 w-full" disabled={!!busy || !importUrl.trim()} onClick={readListing}>{busy === "read" ? "Reading… (up to a minute)" : "Read listing"}</button>
            </div>
            <div className="flex flex-col rounded-lg bg-white p-5 ring-1 ring-stone-200">
              <p className="font-semibold">Add by hand</p>
              <p className="mt-1 text-sm text-stone-500">Type the details and upload your own photos.</p>
              <button className="btn-ghost mt-auto w-full" onClick={() => setEditing({ id: null, draft: EMPTY })}>Add listing</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((l, i) => (
            <div key={l.id} className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {l.photos[0] ? <img src={l.photos[0]} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" /> : <div className="h-16 w-24 shrink-0 rounded-lg bg-stone-100" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.address === NEEDS_ADDRESS ? <span className="text-amber-700">Needs an address (hidden from your site)</span> : <>{l.address}{l.city ? `, ${l.city}` : ""}</>}</p>
                <p className="text-xs text-stone-500">{[l.price, STATUS.find(([v]) => v === l.status)?.[1], l.beds && `${l.beds} bd`, l.baths && `${l.baths} ba`, `${l.photos.length} photo${l.photos.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-stone-600">
                <input type="checkbox" checked={l.featured} onChange={(e) => run("toggle", async () => {
                  const { item } = await apiJson(`${base}/${l.id}`, "PATCH", { featured: e.target.checked });
                  setItems(items.map((x) => (x.id === l.id ? item : x)));
                })} /> Show
              </label>
              <div className="flex gap-1">
                <button className="btn-ghost !px-2 !py-1" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="btn-ghost !px-2 !py-1" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="btn-ghost !py-1" onClick={() => setEditing({ id: l.id, draft: toDraft(l) })}>Edit</button>
                <button className="btn-ghost !py-1 text-red-700" onClick={() => confirm(`Delete ${l.address}?`) && run("del", async () => {
                  await apiJson(`${base}/${l.id}`, "DELETE"); setItems(items.filter((x) => x.id !== l.id));
                })}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ListingForm({ siteId, draft: d, onChange, onSave, onCancel, busy, found, onFoundChange, notes }: {
  siteId: string; draft: Draft; onChange: (d: Draft) => void; onSave: () => void; onCancel: () => void; busy: boolean;
  found?: Found; onFoundChange?: (f: Found) => void; notes?: string[];
}) {
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => onChange({ ...d, [k]: v });
  const add = async (files: FileList | null) => {
    if (!files) return;
    setErr(null);
    const list = Array.from(files).slice(0, 20 - d.photos.length);
    setUploading(list.length);
    const urls: string[] = [];
    for (const f of list) {
      try { urls.push(await uploadPhoto(siteId, f, "listing")); } catch (e) { setErr((e as Error).message); }
      setUploading((n) => n - 1);
    }
    onChange({ ...d, photos: [...d.photos, ...urls] });
  };
  return (
    <div className="space-y-5 rounded-xl border border-stone-200 bg-white p-5">
      {notes && notes.length > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notes.join(" ")}</p>}
      {found && found.photos.length > 0 && onFoundChange && (
        <FoundPhotos found={found} room={MAX_PHOTOS - d.photos.length} onChange={onFoundChange} />
      )}
      <div>
        <span className="label">Photos <span className="font-normal text-stone-400">(first is the cover; up to 20)</span></span>
        <div className="flex flex-wrap gap-2">
          {d.photos.map((p, i) => (
            <div key={p} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className={`h-24 w-32 rounded-lg object-cover ${i === 0 ? "ring-2 ring-stone-900" : ""}`} />
              <div className="absolute inset-x-1 bottom-1 hidden justify-between gap-1 group-hover:flex">
                {i > 0 && <button className="rounded bg-white/90 px-1.5 text-xs" onClick={() => set("photos", [p, ...d.photos.filter((x) => x !== p)])}>Cover</button>}
                <button className="ml-auto rounded bg-white/90 px-1.5 text-xs text-red-700" onClick={() => set("photos", d.photos.filter((x) => x !== p))}>Remove</button>
              </div>
            </div>
          ))}
          <label className="flex h-24 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-500 hover:bg-stone-50">
            {uploading ? `Uploading ${uploading}…` : "+ Add photos"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2"><Field label="Street address"><input className="input" value={d.address} onChange={(e) => set("address", e.target.value)} placeholder="1234 Elm Street" /></Field></div>
        <Field label="City"><input className="input" value={d.city} onChange={(e) => set("city", e.target.value)} placeholder="Tucson, AZ" /></Field>
        <Field label="Price"><input className="input" value={d.price} onChange={(e) => set("price", e.target.value)} placeholder="$725,000" /></Field>
        <Field label="Status">
          <select className="input" value={d.status} onChange={(e) => set("status", e.target.value as Draft["status"])}>
            {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Square feet"><input className="input" inputMode="numeric" value={d.sqft} onChange={(e) => set("sqft", e.target.value)} /></Field>
        <Field label="Beds"><input className="input" inputMode="decimal" value={d.beds} onChange={(e) => set("beds", e.target.value)} /></Field>
        <Field label="Baths"><input className="input" inputMode="decimal" value={d.baths} onChange={(e) => set("baths", e.target.value)} /></Field>
        <Field label="Listing link (optional)" hint="Where the card links, e.g. your brokerage listing page"><input className="input" value={d.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} placeholder="https://" /></Field>
      </div>
      <Field label="Description (optional)"><textarea className="input" rows={4} maxLength={2000} value={d.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <p className="text-xs text-stone-500">Only feature listings you represented, and follow your MLS&apos;s rules for sold data and photo credit.</p>
      <div className="flex gap-2">
        <button className="btn" disabled={busy || uploading > 0} onClick={onSave}>{busy ? "Saving…" : "Save listing"}</button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/** Pick which photos from the listing page come over. They're copied into the library on save. */
function FoundPhotos({ found, room, onChange }: { found: Found; room: number; onChange: (f: Found) => void }) {
  const toggle = (u: string) => {
    if (found.picked.includes(u)) onChange({ ...found, picked: found.picked.filter((x) => x !== u) });
    else if (found.picked.length < room) onChange({ ...found, picked: [...found.picked, u] });
  };
  const order = (u: string) => found.photos.filter((x) => found.picked.includes(x)).indexOf(u);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="label !mb-0">Photos found on the page <span className="font-normal text-stone-400">({found.picked.length} of {found.photos.length} selected, up to {room})</span></span>
        <div className="flex gap-3 text-xs">
          <button className="underline" onClick={() => onChange({ ...found, picked: found.photos.slice(0, room) })}>Select all</button>
          <button className="underline" onClick={() => onChange({ ...found, picked: [] })}>Clear all</button>
        </div>
      </div>
      <p className="mb-2 mt-1 text-xs text-stone-500">Tap to include or leave out. Selected photos are copied into your library when you save, in this order; the first is the cover unless you already have photos below.</p>
      <div className="flex max-h-80 flex-wrap gap-2 overflow-y-auto">
        {found.photos.map((u) => {
          const on = found.picked.includes(u);
          return (
            <button key={u} type="button" onClick={() => toggle(u)} aria-pressed={on} aria-label={on ? "Leave out this photo" : "Include this photo"}
              className={`relative overflow-hidden rounded-lg border-2 ${on ? "border-stone-900" : "border-transparent opacity-50 hover:opacity-100"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-24 w-32 object-cover" />
              {on && <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-900 px-1 text-[11px] text-white">{order(u) + 1}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
