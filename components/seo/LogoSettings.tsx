"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyze, contentBounds, removeBackground } from "@/lib/logo";
import { BoxCropper, type Box } from "@/components/manage/BoxCropper";

type Prepared = { original: ImageData; w: number; h: number; bg: [number, number, number] | null; hasTransparency: boolean };

/** Logo upload with automatic background removal and a manual crop (done in the browser, previewed before saving). */
export function LogoSettings({ siteId, current, agentName }: { siteId: string; current: string | null; agentName: string }) {
  const router = useRouter();
  const [prep, setPrep] = useState<Prepared | null>(null);
  const [remove, setRemove] = useState(true);
  const [mode, setMode] = useState<"connected" | "all">("connected");
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const fullCanvas = useRef<HTMLCanvasElement | null>(null);
  const [auto, setAuto] = useState<Box | null>(null);
  const [crop, setCrop] = useState<Box | null>(null);
  const touched = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function load(src: string, revoke = false) {
    const img = new Image();
    img.crossOrigin = "anonymous"; // the saved logo lives in public storage; needed to edit its pixels
    img.src = src;
    await img.decode().catch(() => null);
    if (revoke) URL.revokeObjectURL(src);
    if (!img.naturalWidth) { setMsg({ ok: false, text: "Couldn't read that image." }); return; }
    const scale = Math.min(1, 1200 / img.naturalWidth, 600 / img.naturalHeight);
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    let data: ImageData;
    try { data = ctx.getImageData(0, 0, w, h); } catch { setMsg({ ok: false, text: "Couldn't open that logo for editing. Upload the file again instead." }); return; }
    const a = analyze(data.data, w, h);
    touched.current = false;
    setPrep({ original: data, w, h, bg: a.background, hasTransparency: a.hasTransparency });
    setRemove(Boolean(a.background));
    setMode("connected");
  }

  async function onFile(f?: File) {
    if (!f) return;
    setMsg(null);
    if (!f.type.startsWith("image/") || f.type === "image/svg+xml") { setMsg({ ok: false, text: "Upload a PNG, JPG or WebP logo." }); return; }
    await load(URL.createObjectURL(f), true);
  }

  // Re-render the processed logo whenever the background options change. The crop starts
  // trimmed to the logo; once the agent moves it, their crop is kept.
  useEffect(() => {
    if (!prep) return;
    let pixels: Uint8ClampedArray = prep.original.data;
    if (remove && prep.bg) pixels = removeBackground(pixels, prep.w, prep.h, prep.bg, mode);
    const full = document.createElement("canvas");
    full.width = prep.w; full.height = prep.h;
    const img = full.getContext("2d")!.createImageData(prep.w, prep.h);
    img.data.set(pixels);
    full.getContext("2d")!.putImageData(img, 0, 0);
    fullCanvas.current = full;
    const b = contentBounds(pixels, prep.w, prep.h);
    setAuto(b);
    if (!touched.current) setCrop(b);
    full.toBlob((bl) => bl && setFullUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(bl); }), "image/png");
  }, [prep, remove, mode]);

  // Cut the crop out of the processed image.
  useEffect(() => {
    const full = fullCanvas.current;
    if (!full || !crop) return;
    const out = document.createElement("canvas");
    out.width = crop.w; out.height = crop.h;
    out.getContext("2d")!.drawImage(full, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    out.toBlob((bl) => {
      if (!bl) return;
      setBlob(bl);
      setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(bl); });
    }, "image/png");
  }, [crop, fullUrl]);

  const setCropByHand = (b: Box) => { touched.current = true; setCrop(b); };

  async function save() {
    if (!blob) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.set("file", new File([blob], "logo.png", { type: "image/png" }));
    fd.set("kind", "logo");
    const res = await fetch(`/api/sites/${siteId}/assets`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: data.error ?? "Upload failed" }); return; }
    setPrep(null);
    setMsg({ ok: true, text: "Logo saved. It replaces your name in the site header." });
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Logo</h2>
        <p className="mt-1 text-sm text-stone-500">Shown in your site header instead of your name. A solid background is removed automatically so the logo sits cleanly on any color.</p>
      </div>
      {!prep && (
        <div className="flex flex-wrap items-center gap-4">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt={`${agentName} logo`} className="h-14 w-auto max-w-[240px] rounded border border-stone-100 object-contain p-1" style={{ backgroundImage: "repeating-conic-gradient(#f5f5f4 0% 25%, #fff 0% 50%)", backgroundSize: "12px 12px" }} />
          ) : <span className="text-sm text-stone-400">No logo yet. Your name is shown instead.</span>}
          <div className="flex flex-wrap gap-2">
            {current && <button className="btn-ghost" onClick={() => { setMsg(null); load(current); }}>Crop</button>}
            <button className="btn-ghost" onClick={() => file.current?.click()}>{current ? "Replace logo" : "Upload logo"}</button>
          </div>
        </div>
      )}
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {prep && (
        <div className="space-y-3">
          {fullUrl && crop && (
            <div className="space-y-2">
              <p className="text-xs text-stone-500">Drag the box to crop: edges and corners resize it, the middle moves it. Leave a little space around the logo.</p>
              <BoxCropper src={fullUrl} imgW={prep.w} imgH={prep.h} box={crop} onChange={setCropByHand} />
              <div className="flex flex-wrap gap-3 text-xs">
                {auto && <button className="underline" onClick={() => { touched.current = false; setCrop(auto); }}>Fit to logo</button>}
                <button className="underline" onClick={() => setCropByHand({ x: 0, y: 0, w: prep.w, h: prep.h })}>Whole image</button>
                <span className="text-stone-400">{crop.w} × {crop.h}px</span>
              </div>
            </div>
          )}
          {previewUrl && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">In your site header</p>
              <div className="overflow-hidden rounded-lg border border-stone-200">
                {[["#ffffff", "#1c1917"], ["#1c1917", "#f5f5f4"]].map(([bg, fg]) => (
                  <div key={bg} className="flex items-center justify-between px-4 py-3" style={{ background: bg, color: fg }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="" className="h-9 w-auto max-w-[180px] object-contain sm:h-11" />
                    <span className="flex gap-3 text-[11px] opacity-70"><span>Buy</span><span>Sell</span><span>Contact</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {prep.hasTransparency ? (
            <p className="text-sm text-emerald-700">This logo already has a transparent background.</p>
          ) : prep.bg ? (
            <div className="space-y-1.5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={remove} onChange={(e) => setRemove(e.target.checked)} /> Remove background <span className="inline-block h-3.5 w-3.5 rounded border border-stone-300" style={{ background: `rgb(${prep.bg.join(",")})` }} /></label>
              {remove && <label className="flex items-center gap-2 pl-6 text-stone-600"><input type="checkbox" checked={mode === "all"} onChange={(e) => setMode(e.target.checked ? "all" : "connected")} /> Also clear enclosed areas (e.g. inside letters)</label>}
            </div>
          ) : (
            <p className="text-sm text-amber-700">We couldn&apos;t find a solid background to remove, so the logo will be used as is. For best results, upload a PNG with a transparent background.</p>
          )}
          {msg && !msg.ok && <p className="text-sm text-red-700">{msg.text}</p>}
          <div className="flex gap-2">
            <button className="btn" disabled={busy || !blob} onClick={save}>{busy ? "Saving…" : "Use this logo"}</button>
            <button className="btn-ghost" onClick={() => setPrep(null)}>Cancel</button>
          </div>
        </div>
      )}
      {msg && (msg.ok || !prep) && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </section>
  );
}
