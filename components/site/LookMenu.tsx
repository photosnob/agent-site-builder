"use client";
import { useEffect, useState } from "react";

/** Full-screen menu used by the Noir and Riviera headers. */
export function LookMenu({ links, label = "Menu", showLabel = false }: { links: { href: string; label: string; external?: boolean }[]; label?: string; showLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-label={showLabel ? undefined : label} className="flex h-11 items-center gap-3 text-[11px] uppercase tracking-[0.28em]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M3 8h18M3 16h18" /></svg>
        {showLabel && <span>{label}</span>}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-[60] flex flex-col overflow-y-auto" style={{ background: "var(--bg)", color: "var(--text)" }}>
          <div className="site-container flex w-full justify-end py-5">
            <button type="button" autoFocus onClick={() => setOpen(false)} className="flex h-11 items-center gap-3 text-[11px] uppercase tracking-[0.28em]">
              Close<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
          </div>
          <nav aria-label="Main" className="site-container flex w-full flex-1 flex-col justify-center gap-2 pb-20">
            {links.map((l, i) => (
              <a key={l.label} href={l.href} onClick={() => setOpen(false)} {...(l.external ? { target: "_blank", rel: "noopener" } : {})}
                className="group flex items-baseline gap-6 border-b py-4 transition-opacity hover:opacity-70" style={{ borderColor: "color-mix(in srgb, var(--text) 12%, transparent)" }}>
                <span className="text-[11px] tracking-[0.3em]" style={{ color: "var(--muted)" }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="site-heading text-4xl sm:text-6xl">{l.label}</span>
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
