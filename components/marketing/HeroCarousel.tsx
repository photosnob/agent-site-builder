"use client";
import { useEffect, useState } from "react";
import { BRAND } from "./Brand";

const SLIDES = [
  { id: "monument", name: "Modern", domain: "vivianchohomes.com", prompt: "Put my Racquet Club listing first." },
  { id: "heritage", name: "Heritage", domain: "vantagepg.com", prompt: "Add our new Westlake listing at $7.45M." },
  { id: "riviera", name: "Riviera", domain: "casaandco.com", prompt: "Swap the hero for my Carmel road photo." },
  { id: "noir", name: "Noir", domain: "aureliaestates.com", prompt: "Mark Alpine Drive as sold." },
  { id: "estate", name: "Estate", domain: "clairebennett.com", prompt: "Rewrite my bio to sound warmer." },
  { id: "bright", name: "Bright", domain: "northlinerealty.com", prompt: "Make the buttons black." },
] as const;

const label = "text-[12px] font-medium uppercase tracking-[0.18em]";

/** Real template screenshots crossfading in a browser frame. Pauses on hover; no autoplay for reduced motion. */
export function HeroCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => { setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  useEffect(() => {
    if (paused || still) return;
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), 4500);
    return () => clearTimeout(t);
  }, [i, paused, still]);

  const s = SLIDES[i];
  return (
    <div className="flex flex-col gap-4" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="overflow-hidden rounded border bg-white" style={{ borderColor: BRAND.sand, boxShadow: "0 30px 60px -30px rgba(17,17,16,.35)" }}>
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: BRAND.sand }}>
          {[0, 1, 2].map((k) => <span key={k} className="h-2.5 w-2.5 rounded-full" style={{ background: BRAND.sand }} />)}
          <span className={`ml-3 ${label}`} style={{ color: BRAND.taupe }} aria-live="polite">{s.domain}</span>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden" style={{ background: "#1E2A2B" }}>
          {SLIDES.map((x, k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={x.id} src={`/templates/desk-${x.id}.webp`} alt={k === i ? `${x.name} template, shown with a sample agent site` : ""} aria-hidden={k !== i}
              width={1200} height={750} loading={k === 0 ? "eager" : "lazy"} decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ease-out"
              style={{ opacity: k === i ? 1 : 0 }} />
          ))}
          <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-[14px] px-4 py-3 sm:inset-x-5 sm:bottom-5" style={{ background: BRAND.evergreen, color: BRAND.ivory, boxShadow: "0 12px 30px -12px rgba(0,0,0,.5)" }}>
            <span className="h-6 w-6 shrink-0 rounded-lg" style={{ background: BRAND.brass }} aria-hidden />
            <span key={s.id} className="flex-1 truncate text-sm">“{s.prompt}”</span>
            <span className="hidden text-[11px] uppercase tracking-[0.18em] sm:inline" style={{ color: BRAND.sage }}>editing…</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="tablist" aria-label="Templates">
        {SLIDES.map((x, k) => (
          <button key={x.id} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}
            className={`${label} border-b-2 pb-1 transition-colors`} style={{ color: k === i ? BRAND.evergreen : BRAND.taupe, borderColor: k === i ? BRAND.brass : "transparent" }}>
            {x.name}
          </button>
        ))}
      </div>
    </div>
  );
}
