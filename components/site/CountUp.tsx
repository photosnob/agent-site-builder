"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Splits a stat like "$1.2B+", "14 yrs", "4.9★" or "2,450" into the text around its
 * first number and the number itself, so the number can count up while the rest stays put.
 */
export function parseStat(value: string): { before: string; n: number; decimals: number; commas: boolean; after: string } | null {
  const m = value.match(/(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/);
  if (!m || m.index === undefined) return null;
  const n = Number((m[1] + (m[2] ?? "")).replace(/,/g, ""));
  if (!Number.isFinite(n) || n === 0) return null;
  // A year ("Since 2008") shouldn't count up from zero.
  if (!m[2] && n >= 1900 && n <= 2100 && !value.includes("$")) return null;
  return { before: value.slice(0, m.index), n, decimals: m[2] ? m[2].length - 1 : 0, commas: m[1].includes(","), after: value.slice(m.index + m[0].length) };
}

export function formatStat(p: NonNullable<ReturnType<typeof parseStat>>, x: number): string {
  const num = p.commas
    ? x.toLocaleString("en-US", { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals })
    : x.toFixed(p.decimals);
  return p.before + num + p.after;
}

/**
 * A number that counts up from zero the first time it scrolls into view. The page is
 * rendered with the final value (search engines, no-JS and reduced motion all see it),
 * and stats already on screen when the page loads stay as they are.
 */
export function CountUp({ value, duration = 1600 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const parsed = parseStat(value);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !parsed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // already visible: don't flash to zero
    setShown(formatStat(parsed, 0));
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - k, 3);
        setShown(k < 1 ? formatStat(parsed, parsed.n * eased) : value);
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden className="tabular-nums">{shown}</span>
    </>
  );
}
