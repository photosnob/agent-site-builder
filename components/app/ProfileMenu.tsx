"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** Avatar button with the signed-in email, quick links and Log out. */
export function ProfileMenu({ links = [] }: { links?: { href: string; label: string }[] }) {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const initial = (email?.[0] ?? "?").toUpperCase();
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white hover:bg-stone-700">
        {initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white text-sm shadow-lg">
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="text-xs text-stone-500">Signed in as</p>
            <p className="truncate font-medium text-stone-900">{email ?? "…"}</p>
          </div>
          {links.map((l) => (
            <Link key={l.href} role="menuitem" href={l.href} onClick={() => setOpen(false)} className="block px-4 py-2.5 text-stone-700 hover:bg-stone-50">{l.label}</Link>
          ))}
          <form action="/auth/signout" method="post" onSubmit={clearLocalBackups} className="border-t border-stone-100">
            <button role="menuitem" type="submit" className="w-full px-4 py-2.5 text-left font-medium text-red-700 hover:bg-red-50">Log out</button>
          </form>
        </div>
      )}
    </div>
  );
}

/** Unsaved-post backups belong to the account that wrote them; drop them on the way out. */
function clearLocalBackups() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("ll-post-backup:")) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}
