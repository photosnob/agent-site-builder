"use client";
import { useEffect, useRef, useState } from "react";

export type Box = { x: number; y: number; w: number; h: number };
type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN = 8; // smallest crop, in image pixels

/**
 * Free-form crop box over an image (any shape, for logos). Drag inside to
 * move, drag edges or corners to resize, arrow keys to nudge (Shift resizes).
 * `box` is in the image's own pixels.
 */
export function BoxCropper({ src, imgW, imgH, box, onChange, checker = true }: { src: string; imgW: number; imgH: number; box: Box; onChange: (b: Box) => void; checker?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const drag = useRef<{ h: Handle; px: number; py: number; start: Box } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / imgW, 320 / imgH));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imgW, imgH]);

  const clamp = (b: Box): Box => {
    const w = Math.max(MIN, Math.min(b.w, imgW)), h = Math.max(MIN, Math.min(b.h, imgH));
    return { x: Math.round(Math.max(0, Math.min(b.x, imgW - w))), y: Math.round(Math.max(0, Math.min(b.y, imgH - h))), w: Math.round(w), h: Math.round(h) };
  };

  function down(h: Handle, e: React.PointerEvent) {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { h, px: e.clientX, py: e.clientY, start: box };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.px) / scale, dy = (e.clientY - d.py) / scale;
    let { x, y, w, h } = d.start;
    if (d.h === "move") { onChange(clamp({ x: x + dx, y: y + dy, w, h })); return; }
    if (d.h.includes("w")) { const nx = Math.max(0, Math.min(x + dx, x + w - MIN)); w += x - nx; x = nx; }
    if (d.h.includes("e")) w = Math.max(MIN, Math.min(w + dx, imgW - x));
    if (d.h.includes("n")) { const ny = Math.max(0, Math.min(y + dy, y + h - MIN)); h += y - ny; y = ny; }
    if (d.h.includes("s")) h = Math.max(MIN, Math.min(h + dy, imgH - y));
    onChange(clamp({ x, y, w, h }));
  }
  function key(e: React.KeyboardEvent) {
    const step = e.altKey ? 1 : 4;
    const k: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!k[e.key]) return;
    e.preventDefault();
    const [dx, dy] = k[e.key];
    onChange(clamp(e.shiftKey ? { ...box, w: box.w + dx, h: box.h + dy } : { ...box, x: box.x + dx, y: box.y + dy }));
  }

  const s = scale;
  const handles: [Handle, React.CSSProperties, string][] = [
    ["nw", { left: -6, top: -6 }, "nwse-resize"], ["ne", { right: -6, top: -6 }, "nesw-resize"],
    ["sw", { left: -6, bottom: -6 }, "nesw-resize"], ["se", { right: -6, bottom: -6 }, "nwse-resize"],
    ["n", { left: "50%", top: -6, marginLeft: -6 }, "ns-resize"], ["s", { left: "50%", bottom: -6, marginLeft: -6 }, "ns-resize"],
    ["w", { top: "50%", left: -6, marginTop: -6 }, "ew-resize"], ["e", { top: "50%", right: -6, marginTop: -6 }, "ew-resize"],
  ];

  return (
    <div ref={wrap} className="w-full">
      <div className="relative mx-auto touch-none select-none" style={{ width: imgW * s, height: imgH * s, ...(checker ? { backgroundImage: "repeating-conic-gradient(#e7e5e4 0% 25%, #fff 0% 50%)", backgroundSize: "14px 14px" } : {}) }}
        onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
        {/* Shade everything outside the crop. */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(28,25,23,.45)", clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${box.x * s}px ${box.y * s}px,${box.x * s}px ${(box.y + box.h) * s}px,${(box.x + box.w) * s}px ${(box.y + box.h) * s}px,${(box.x + box.w) * s}px ${box.y * s}px,${box.x * s}px ${box.y * s}px)` }} />
        <div role="slider" tabIndex={0} aria-label="Crop area. Drag to move, drag the edges to resize, or use arrow keys (Shift resizes)."
          aria-valuetext={`${box.w} by ${box.h} pixels at ${box.x}, ${box.y}`} onKeyDown={key}
          className="absolute cursor-move outline outline-2 outline-white focus-visible:outline-amber-400" style={{ left: box.x * s, top: box.y * s, width: box.w * s, height: box.h * s, boxShadow: "0 0 0 1px rgba(0,0,0,.5)" }}
          onPointerDown={(e) => down("move", e)}>
          {handles.map(([h, pos, cursor]) => (
            <span key={h} aria-hidden onPointerDown={(e) => down(h, e)} className="absolute h-3 w-3 rounded-sm border border-stone-700 bg-white" style={{ ...pos, cursor }} />
          ))}
        </div>
      </div>
    </div>
  );
}
