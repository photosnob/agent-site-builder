"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyze, contentBounds, removeBackground } from "@/lib/logo";

type Prepared = { original: ImageData; w: number; h: number; bg: [number, number, number] | null; hasTransparency: boolean };

/** Logo upload with automatic background removal (done in the browser, previewed before saving). */
export function LogoSettings({ siteId, current, agentName }: { siteId: string; current: string | null; agentName: string }) {
  const router = useRouter();
  const [prep, setPrep] = useState<Prepared | null>(null);
  const [remove, setRemove] = useState(true);
  const [mode, setMode] = useState<"connected" | "all">("connected");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [backdrop, setBackdrop] = useState<"checker" | "light" | "dark">("checker");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function onFile(f?: File) {
    if (!f) return;
    setMsg(null);
    if (!f.type.startsWith("image/") || f.type === "image/svg+xml") { setMsg({ ok: false, text: "Upload a PNG, JPG or WebP logo." }); return; }
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await img.decode().catch(() => null);
    if (!img.naturalWidth) { setMsg({ ok: false, text: "Couldn't read that image." }); return; }
    const scale = Math.min(1, 1200 / img.naturalWidth, 600 / img.naturalHeight);
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const a = analyze(data.data, w, h);
    setPrep({ original: data, w, h, bg: a.background, hasTransparency: a.hasTransparency });
    setRemove(Boolean(a.background));
    setMode("connected");
  }

  // Re-render the processed logo whenever the options change.
  useEffect(() => {
    if (!prep) return;
    let pixels: Uint8ClampedArray = prep.original.data;
    if (remove && prep.bg) pixels = removeBackground(pixels, prep.w, prep.h, prep.bg, mode);
    const b = contentBounds(pixels, prep.w, prep.h);
    const full = document.createElement("canvas");
    full.width = prep.w; full.height = prep.h;
    const img = full.getContext("2d")!.createImageData(prep.w, prep.h);
    img.data.set(pixels);
    full.getContext("2d")!.putImageData(img, 0, 0);
    const out = document.createElement("canvas");
    out.width = b.w; out.height = b.h;
    out.getContext("2d")!.drawImage(full, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    out.toBlob((bl) => {
      if (!bl) return;
      setBlob(bl);
      setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(bl); });
    }, "image/png");
  }, [prep, remove, mode]);

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

  const backdropStyle = backdrop === "dark" ? { background: "#1c1917" } : backdrop === "light" ? { background: "#ffffff" } : { backgroundImage: "repeating-conic-gradient(#e7e5e4 0% 25%, #fff 0% 50%)", backgroundSize: "16px 16px" };

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
          <button className="btn-ghost" onClick={() => file.current?.click()}>{current ? "Replace logo" : "Upload logo"}</button>
        </div>
      )}
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {prep && (
        <div className="space-y-3">
          <div className="flex min-h-32 items-center justify-center rounded-lg p-6" style={backdropStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {previewUrl && <img src={previewUrl} alt="Logo preview" className="max-h-28 w-auto max-w-full object-contain" />}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-stone-500">Preview on:</span>
            {(["checker", "light", "dark"] as const).map((b) => <button key={b} className={`rounded-full px-2.5 py-1 ${backdrop === b ? "bg-stone-900 text-white" : "border border-stone-300"}`} onClick={() => setBackdrop(b)}>{b === "checker" ? "Transparent" : b === "light" ? "Light" : "Dark"}</button>)}
          </div>
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
