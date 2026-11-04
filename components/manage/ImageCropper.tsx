"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Where the crop sits on the original: center as fractions of its width/height, and zoom (1 = fill the frame). */
export type CropState = { cx: number; cy: number; zoom: number };

const FRAME = 300; // on-screen frame width in px
const MAX_ZOOM = 4;

/**
 * Drag to reposition, slider/scroll to zoom. The image always covers the frame,
 * so there are never empty edges. `circle` overlays a guide for round placements.
 */
export function ImageCropper({
  src,
  aspect = 1,
  initial,
  circle = false,
  outputWidth = 1000,
  onCancel,
  onSave,
  saving = false,
}: {
  src: string;
  aspect?: number; // width / height
  initial?: CropState | null;
  circle?: boolean;
  outputWidth?: number;
  onCancel: () => void;
  onSave: (blob: Blob, crop: CropState) => void;
  saving?: boolean;
}) {
  const W = FRAME, H = Math.round(FRAME / aspect);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropState>(initial ?? { cx: 0.5, cy: 0.5, zoom: 1 });
  const drag = useRef<{ x: number; y: number; start: CropState } | null>(null);

  useEffect(() => {
    const el = new Image();
    el.crossOrigin = "anonymous"; // stored photos are public; needed so the canvas can export
    el.onload = () => setImg(el);
    el.onerror = () => setError("Couldn't load this photo for editing. Try uploading it again.");
    el.src = src;
  }, [src]);

  // Size of the whole image on screen at the current zoom.
  const geometry = useCallback((c: CropState) => {
    if (!img) return null;
    const base = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const s = base * c.zoom;
    return { s, dw: img.naturalWidth * s, dh: img.naturalHeight * s };
  }, [img, W, H]);

  // Keep the frame fully covered.
  const clamp = useCallback((c: CropState): CropState => {
    const g = geometry(c);
    if (!g) return c;
    const hx = W / 2 / g.dw, hy = H / 2 / g.dh;
    return { zoom: c.zoom, cx: Math.min(1 - hx, Math.max(hx, c.cx)), cy: Math.min(1 - hy, Math.max(hy, c.cy)) };
  }, [geometry, W, H]);

  useEffect(() => { if (img) setCrop((c) => clamp(c)); }, [img, clamp]);

  const g = geometry(crop);
  const left = g ? W / 2 - crop.cx * g.dw : 0;
  const top = g ? H / 2 - crop.cy * g.dh : 0;

  function setZoom(z: number) {
    setCrop((c) => clamp({ ...c, zoom: Math.min(MAX_ZOOM, Math.max(1, z)) }));
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: crop };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current, gg = geometry(crop);
    if (!d || !gg) return;
    setCrop(clamp({ zoom: d.start.zoom, cx: d.start.cx - (e.clientX - d.x) / gg.dw, cy: d.start.cy - (e.clientY - d.y) / gg.dh }));
  }
  function onKey(e: React.KeyboardEvent) {
    const gg = geometry(crop);
    if (!gg) return;
    const step = 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setCrop((c) => clamp({ ...c, cx: c.cx - dx / gg.dw, cy: c.cy - dy / gg.dh }));
    } else if (e.key === "+" || e.key === "=") setZoom(crop.zoom + 0.1);
    else if (e.key === "-") setZoom(crop.zoom - 0.1);
  }

  // Scroll-to-zoom needs a non-passive listener to stop the page scrolling.
  const frameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setCrop((c) => clamp({ ...c, zoom: Math.min(MAX_ZOOM, Math.max(1, c.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06))) })); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clamp]);

  function save() {
    const gg = geometry(crop);
    if (!img || !gg) return;
    const sw = W / gg.s, sh = H / gg.s;
    const sx = crop.cx * img.naturalWidth - sw / 2, sy = crop.cy * img.naturalHeight - sh / 2;
    const outW = Math.min(outputWidth, Math.round(sw)), outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    try {
      canvas.toBlob((b) => { if (b) onSave(b, crop); else setError("Couldn't save the crop."); }, "image/jpeg", 0.9);
    } catch {
      setError("Couldn't save the crop. Try uploading the photo again.");
    }
  }

  if (error) return <p className="text-sm text-red-600">{error} <button className="underline" onClick={onCancel}>Close</button></p>;

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        tabIndex={0}
        role="application"
        aria-label="Photo crop. Drag or use arrow keys to reposition, plus and minus to zoom."
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="relative cursor-grab touch-none select-none overflow-hidden rounded-lg bg-stone-200 outline-none focus-visible:ring-2 focus-visible:ring-stone-900 active:cursor-grabbing"
        style={{ width: W, height: H, maxWidth: "100%" }}
      >
        {img && g && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" draggable={false} crossOrigin="anonymous" className="pointer-events-none absolute max-w-none" style={{ left, top, width: g.dw, height: g.dh }} />
        )}
        {circle && (
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at center, transparent ${Math.min(W, H) / 2 - 1}px, rgba(255,255,255,0.55) ${Math.min(W, H) / 2}px)` }} />
        )}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/60" />)}
        </div>
        {!img && <div className="absolute inset-0 flex items-center justify-center text-sm text-stone-500">Loading…</div>}
      </div>
      <div className="flex items-center gap-3" style={{ width: W, maxWidth: "100%" }}>
        <span className="text-xs text-stone-500">Zoom</span>
        <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={crop.zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" aria-label="Zoom" />
      </div>
      <p className="text-xs text-stone-500">Drag to reposition. Scroll or use the slider to zoom.{circle ? " The clear circle is what shows in round spots like the author box." : ""}</p>
      <div className="flex gap-2">
        <button className="btn" disabled={!img || saving} onClick={save}>{saving ? "Saving…" : "Save photo"}</button>
        <button className="btn-ghost" disabled={saving} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
