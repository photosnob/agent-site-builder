"use client";
import { useEffect, useState } from "react";

/** Crossfading background photos with a slow zoom. Respects reduced motion and pauses in background tabs. */
export function HeroSlideshow({ images, interval = 6000 }: { images: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
    if (mq.matches || images.length < 2) return;
    const t = setInterval(() => { if (!document.hidden) setI((n) => (n + 1) % images.length); }, interval);
    return () => clearInterval(t);
  }, [images.length, interval]);
  return (
    <div className="absolute inset-0" aria-hidden>
      {images.map((src, n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" loading={n === 0 ? "eager" : "lazy"} fetchPriority={n === 0 ? "high" : "low"}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: n === i ? 1 : 0,
            transform: !still && n === i ? "scale(1.08)" : "scale(1)",
            transition: still ? "none" : `opacity 1.6s ease-in-out, transform ${interval + 1600}ms linear`,
          }} />
      ))}
    </div>
  );
}
