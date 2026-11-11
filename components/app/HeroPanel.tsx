"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadPhoto } from "@/components/manage/shared";

type Style = "full-bleed" | "split" | "centered" | "video" | "slideshow";
type Asset = { id: string; url: string; kind: string; meta: { type?: string } };
import { HeroVideo } from "@/components/site/HeroVideo";

const SPEEDS: [number, string][] = [[0.25, "0.25×"], [0.5, "0.5×"], [0.75, "0.75×"], [1, "Normal"], [1.25, "1.25×"], [1.5, "1.5×"]];

export type HeroState = { style: Style; image?: string; videoUrl?: string; videoSpeed?: number; slides: string[]; secondaryCtaLabel?: string; secondaryCtaTarget?: "contact" | "valuation" | "listings" };

const STYLES: { id: Style; label: string; hint: string }[] = [
  { id: "full-bleed", label: "Photo", hint: "Full-width photo" },
  { id: "split", label: "Split", hint: "Text beside a photo" },
  { id: "centered", label: "Centered", hint: "Headshot and text" },
  { id: "video", label: "Video", hint: "Full-screen looping video" },
  { id: "slideshow", label: "Slideshow", hint: "Rotating photos" },
];

/** Home hero style and media. Saves to the draft (undoable); publish to go live. */
export function HeroPanel({ siteId, initial, assets, onSaved, openSignal = 0 }: { siteId: string; initial: HeroState; assets: Asset[]; onSaved: () => void; openSignal?: number }) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // Other parts of the editor (e.g. an AI reply about missing photos) can ask the panel to open.
  useEffect(() => {
    if (!openSignal) return;
    setOpen(true);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [openSignal]);
  const [h, setHRaw] = useState(initial);
  const setH: typeof setHRaw = (v) => { setHRaw(v); setDirty(true); };
  const [lib, setLib] = useState(assets);
  const [stock, setStock] = useState<{ name: string; url: string; poster: string | null }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const images = lib.filter((a) => a.meta?.type !== "video" && a.kind !== "logo");
  const videos = lib.filter((a) => a.meta?.type === "video");

  useEffect(() => { if (open && h.style === "video" && stock === null) fetch("/api/stock-videos").then((r) => r.json()).then((d) => setStock(d.videos ?? [])).catch(() => setStock([])); }, [open, h.style, stock]);

  async function uploadVideo(f?: File) {
    if (!f) return;
    setMsg(null);
    if (!["video/mp4", "video/webm"].includes(f.type)) { setMsg({ ok: false, text: "Upload an MP4 or WebM video." }); return; }
    if (f.size > 50 * 1024 * 1024) { setMsg({ ok: false, text: "Videos must be under 50 MB. A 15–30 second 1080p clip works best." }); return; }
    setBusy("video");
    try {
      const start = await fetch(`/api/sites/${siteId}/video`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start", contentType: f.type, size: f.size }) }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
      const { error } = await createClient().storage.from("site-assets").uploadToSignedUrl(start.path, start.token, f, { contentType: f.type });
      if (error) throw new Error(error.message);
      const done = await fetch(`/api/sites/${siteId}/video`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "finish", path: start.path }) }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
      setLib((l) => [...l, done.asset]);
      setH((x) => ({ ...x, videoUrl: done.asset.url }));
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  }

  async function uploadImages(files: FileList | null) {
    if (!files) return;
    setBusy("photos");
    for (const f of Array.from(files)) {
      try {
        const url = await uploadPhoto(siteId, f);
        setLib((l) => [...l, { id: url, url, kind: "other", meta: {} }]);
        setH((x) => (x.style === "slideshow" ? { ...x, slides: x.slides.length < 8 ? [...x.slides, url] : x.slides } : { ...x, image: url }));
      } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    }
    setBusy(null);
    setMsg((m) => (m && !m.ok ? m : { ok: true, text: "Uploaded and selected. Click Save hero to use it." }));
  }

  async function save() {
    setBusy("save"); setMsg(null);
    const res = await fetch(`/api/sites/${siteId}/hero`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ heroStyle: h.style, image: h.image ?? null, videoUrl: h.videoUrl ?? null, videoSpeed: h.videoSpeed ?? 1, slides: h.slides, secondaryCtaLabel: h.secondaryCtaLabel || null, secondaryCtaTarget: h.secondaryCtaLabel ? h.secondaryCtaTarget ?? "listings" : null }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setMsg({ ok: false, text: data.error }); return; }
    setMsg({ ok: true, text: "Saved to your draft. Publish to make it live." });
    setDirty(false);
    onSaved();
  }

  const thumb = (url: string, selected: boolean, onClick: () => void, badge?: string) => (
    <button key={url} type="button" onClick={onClick} aria-pressed={selected} className={`relative overflow-hidden rounded-md border-2 ${selected ? "border-stone-900" : "border-transparent hover:border-stone-300"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
      {badge && <span className="absolute left-1 top-1 rounded bg-stone-900 px-1.5 text-[10px] text-white">{badge}</span>}
    </button>
  );
  // A big, obvious upload tile that sits in the photo grid.
  const uploadTile = (
    <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-stone-300 text-center text-xs text-stone-600 hover:border-stone-500 hover:bg-stone-50">
      <span className="text-lg leading-none">+</span>{busy === "photos" ? "Uploading…" : "Upload photos"}
      <input type="file" accept="image/*" multiple className="hidden" disabled={!!busy} onChange={(e) => { uploadImages(e.target.files); e.target.value = ""; }} />
    </label>
  );
  const photoTitle = h.style === "centered" ? "Photo (your headshot if none is picked)" : h.style === "split" ? "Photo beside the text" : h.style === "video" ? "" : "Background photo";

  return (
    <div ref={panelRef} className="mb-4 scroll-mt-4 rounded-lg border border-stone-200">
      <button className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>Hero photo, video &amp; style{!open && <span className="block text-xs font-normal text-stone-500">Change the big image at the top of your home page</span>}</span>
        <span className="font-normal text-stone-500">{STYLES.find((s) => s.id === h.style)?.label} {open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-stone-100 p-3 text-sm">
          <div className="grid grid-cols-3 gap-1.5">
            {STYLES.map((s) => (
              <button key={s.id} type="button" title={s.hint} onClick={() => setH({ ...h, style: s.id })}
                className={`rounded-md border px-2 py-2 text-xs ${h.style === s.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 hover:border-stone-400"}`}>{s.label}</button>
            ))}
          </div>

          {h.style === "video" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Video</p>
              {h.videoUrl && <HeroVideo src={h.videoUrl} speed={h.videoSpeed ?? 1} className="aspect-video w-full rounded-md bg-black object-cover" />}
              {h.videoUrl && (
                <div>
                  <p className="text-xs text-stone-500">Speed</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {SPEEDS.map(([v, label]) => (
                      <button key={v} type="button" onClick={() => setH({ ...h, videoSpeed: v })} className={`rounded-md border px-2 py-1 text-xs ${(h.videoSpeed ?? 1) === v ? "border-stone-900 bg-stone-100" : "border-stone-200"}`}>{label}</button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-stone-400">Slower speeds feel calmer and more cinematic.</p>
                </div>
              )}
              <label className="btn-ghost w-full cursor-pointer">{busy === "video" ? "Uploading… (keep this open)" : "Upload a video (MP4, up to 50 MB)"}
                <input type="file" accept="video/mp4,video/webm" className="hidden" disabled={!!busy} onChange={(e) => { uploadVideo(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {videos.length > 0 && <div className="flex flex-wrap gap-1.5">{videos.map((v) => (
                <button key={v.id} type="button" onClick={() => setH({ ...h, videoUrl: v.url })} className={`rounded-md border px-2 py-1 text-xs ${h.videoUrl === v.url ? "border-stone-900 bg-stone-100" : "border-stone-200"}`}>My video {videos.indexOf(v) + 1}</button>
              ))}</div>}
              <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Stock library</p>
              {stock === null ? <p className="text-xs text-stone-400">Loading…</p> : stock.length === 0 ? <p className="text-xs text-stone-400">No stock clips yet.</p> : (
                <div className="flex flex-wrap gap-1.5">{stock.map((v) => v.poster ? thumb(v.poster, h.videoUrl === v.url, () => setH({ ...h, videoUrl: v.url }), "▶") : (
                  <button key={v.url} type="button" onClick={() => setH({ ...h, videoUrl: v.url })} className={`rounded-md border px-2 py-1 text-xs capitalize ${h.videoUrl === v.url ? "border-stone-900 bg-stone-100" : "border-stone-200"}`}>{v.name}</button>
                ))}</div>
              )}
              <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Still image (phones on data saver, reduced motion)</p>
            </div>
          )}

          {h.style === "slideshow" ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Slides ({h.slides.length}/8), in order</p>
              <p className="text-xs text-stone-500">Tap photos to add or remove them, or upload new ones.</p>
              <div className="grid grid-cols-3 gap-1.5">
                {uploadTile}
                {images.map((a) => {
                  const n = h.slides.indexOf(a.url);
                  return thumb(a.url, n >= 0, () => setH({ ...h, slides: n >= 0 ? h.slides.filter((u) => u !== a.url) : h.slides.length < 8 ? [...h.slides, a.url] : h.slides }), n >= 0 ? String(n + 1) : undefined);
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {photoTitle && <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{photoTitle}</p>}
              <p className="text-xs text-stone-500">Pick one of your photos, or upload a new one.</p>
              <div className="grid grid-cols-3 gap-1.5">
                {uploadTile}
                {images.map((a) => thumb(a.url, h.image === a.url, () => setH({ ...h, image: a.url }), h.image === a.url ? "In use" : undefined))}
              </div>
            </div>
          )}

          {(h.style === "video" || h.style === "slideshow") && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Second button (optional)</p>
              <div className="flex gap-2">
                <input className="input !py-1.5" maxLength={30} placeholder="e.g. View listings" value={h.secondaryCtaLabel ?? ""} onChange={(e) => setH({ ...h, secondaryCtaLabel: e.target.value })} />
                <select className="input !w-32 !py-1.5" value={h.secondaryCtaTarget ?? "listings"} onChange={(e) => setH({ ...h, secondaryCtaTarget: e.target.value as HeroState["secondaryCtaTarget"] })}>
                  <option value="listings">Listings</option><option value="valuation">Home value</option><option value="contact">Contact</option>
                </select>
              </div>
              <p className="text-xs text-stone-400">Stats you added in your profile (like sales volume) show as a bar along the bottom.</p>
            </div>
          )}

          {msg && <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
          {dirty && !busy && <p className="text-xs font-medium text-amber-700">You have unsaved hero changes.</p>}
          <button className="btn w-full" disabled={!!busy} onClick={save}>{busy === "save" ? "Saving…" : "Save hero"}</button>
        </div>
      )}
    </div>
  );
}
