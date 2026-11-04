"use client";
import { useEffect, useState } from "react";
import type { TocEntry } from "@/lib/blog/content";

/** Built from the post's headings. Highlights the section you're reading. */
export function TableOfContents({ toc, variant }: { toc: TocEntry[]; variant: "sidebar" | "inline" }) {
  const [active, setActive] = useState(toc[0]?.id);

  useEffect(() => {
    const els = toc.map((t) => document.getElementById(t.id)).filter((e): e is HTMLElement => !!e);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [toc]);

  const list = (
    <ol className="space-y-1.5 text-sm">
      {toc.map((t) => (
        <li key={t.id} style={{ paddingLeft: `${(t.level - 2) * 0.85}rem` }}>
          <a
            href={`#${t.id}`}
            className="block border-l-2 py-0.5 pl-3 leading-snug transition-colors"
            style={{
              borderColor: active === t.id ? "var(--accent)" : "transparent",
              color: active === t.id ? "var(--text)" : "var(--muted)",
              fontWeight: active === t.id ? 600 : 400,
            }}
          >
            {t.text}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variant === "inline")
    return (
      <details className="my-8 p-4 lg:hidden" style={{ background: "var(--surface)", borderRadius: "var(--radius)" }}>
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide">Topics in this article</summary>
        <div className="mt-3">{list}</div>
      </details>
    );

  return (
    <nav aria-label="Table of contents" className="sticky top-8 hidden max-h-[calc(100vh-4rem)] overflow-y-auto lg:block">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--muted)" }}>Topics in this article</p>
      {list}
    </nav>
  );
}
