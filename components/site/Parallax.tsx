"use client";
import { useEffect, useRef } from "react";

/**
 * A photo that drifts slower than the page as you scroll (parallax). The image is
 * slightly taller than its frame and is shifted by up to `speed` of the frame's
 * height. Off for visitors who prefer reduced motion.
 */
export function ParallaxImage({ src, alt = "", speed = 0.12, className = "", imgClassName = "", priority = false }: {
  src: string; alt?: string; speed?: number; className?: string; imgClassName?: string; priority?: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const f = frame.current, i = img.current;
    if (!f || !i || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false, raf = 0;
    const update = () => {
      raf = 0;
      const r = f.getBoundingClientRect();
      const vh = window.innerHeight;
      // -1 when the frame's center is at the bottom of the screen, +1 at the top.
      const p = Math.max(-1, Math.min(1, (vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2)));
      i.style.transform = `translate3d(0, ${(p * speed * r.height).toFixed(1)}px, 0)`;
    };
    const onScroll = () => { if (visible && !raf) raf = requestAnimationFrame(update); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) onScroll(); }, { rootMargin: "100px" });
    io.observe(f);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [speed]);

  return (
    <div ref={frame} className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async"
        className={`absolute inset-x-0 w-full object-cover will-change-transform ${imgClassName}`}
        style={{ top: `${-speed * 100}%`, height: `${100 + speed * 200}%` }} />
    </div>
  );
}
