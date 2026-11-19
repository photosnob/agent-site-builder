"use client";
import { useRef } from "react";

/**
 * A card that tilts toward the cursor in 3D with a soft light reflection, and
 * settles back when the cursor leaves. Mouse and pen only (touch just scrolls);
 * off for visitors who prefer reduced motion. Renders a link when `href` is set.
 */
export function TiltCard({ children, href, label, max = 7, className = "" }: {
  children: React.ReactNode; href?: string; label?: string; max?: number; className?: string;
}) {
  const card = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function move(e: React.PointerEvent) {
    if (e.pointerType === "touch" || still()) return;
    const el = card.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width; // 0..1
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.transition = "transform 120ms ease-out, box-shadow 300ms ease";
      el.style.transform = `perspective(1100px) rotateX(${((0.5 - y) * max * 2).toFixed(2)}deg) rotateY(${((x - 0.5) * max * 2).toFixed(2)}deg) scale(1.025)`;
      el.style.boxShadow = `${((0.5 - x) * 30).toFixed(0)}px ${(30 + (0.5 - y) * 20).toFixed(0)}px 60px -20px rgba(0,0,0,.55)`;
      if (glare.current) {
        glare.current.style.opacity = "1";
        glare.current.style.background = `radial-gradient(circle at ${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%, rgba(255,255,255,.22), rgba(255,255,255,0) 55%)`;
      }
    });
  }

  function leave() {
    cancelAnimationFrame(raf.current);
    const el = card.current;
    if (!el) return;
    el.style.transition = "transform 600ms cubic-bezier(.2,.8,.2,1), box-shadow 600ms ease";
    el.style.transform = "";
    el.style.boxShadow = "";
    if (glare.current) glare.current.style.opacity = "0";
  }

  const inner = (
    <div ref={card} className={`relative overflow-hidden rounded will-change-transform ${className}`} style={{ transformStyle: "preserve-3d" }}>
      {children}
      <div ref={glare} aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300" />
      {href && label && (
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-2 whitespace-nowrap rounded-full bg-black/75 px-4 py-2 text-sm font-medium text-white opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          {label} ↗
        </span>
      )}
    </div>
  );

  return href ? (
    <a href={href} target="_blank" rel="noopener" className="group block" onPointerMove={move} onPointerLeave={leave}>{inner}</a>
  ) : (
    <div className="group" onPointerMove={move} onPointerLeave={leave}>{inner}</div>
  );
}
