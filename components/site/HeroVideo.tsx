"use client";
import { useEffect, useRef } from "react";

/** Looping background video. Playback speed can't be set in HTML, so it's applied once the video loads. */
export function HeroVideo({ src, poster, speed = 1, className }: { src: string; poster?: string; speed?: number; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const apply = () => { v.defaultPlaybackRate = speed; v.playbackRate = speed; };
    apply();
    v.addEventListener("loadedmetadata", apply);
    v.addEventListener("play", apply);
    return () => { v.removeEventListener("loadedmetadata", apply); v.removeEventListener("play", apply); };
  }, [speed, src]);
  return (
    <video ref={ref} key={src} autoPlay muted loop playsInline preload="metadata" poster={poster} aria-hidden className={className}>
      <source src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
    </video>
  );
}
