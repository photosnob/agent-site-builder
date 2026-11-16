"use client";
import { useState } from "react";

/** Draft preview of an agent's site for admins, with page and device switches. */
export function SitePreviewFrame({ siteId, pages }: { siteId: string; pages: { slug: string; title: string }[] }) {
  const [page, setPage] = useState("");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const src = `/preview/${siteId}${page ? `?page=${encodeURIComponent(page)}` : ""}`;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <select className="input !w-auto !py-1.5" value={page} onChange={(e) => setPage(e.target.value)} aria-label="Page to preview">
          <option value="">Home</option>
          {pages.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
        </select>
        {(["desktop", "phone"] as const).map((d) => (
          <button key={d} onClick={() => setDevice(d)} aria-pressed={device === d} className={`rounded-full px-3 py-1.5 capitalize ${device === d ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}>{d}</button>
        ))}
        <a href={src} target="_blank" rel="noreferrer" className="ml-auto underline">Open full size ↗</a>
      </div>
      <div className="flex justify-center rounded-xl border border-stone-200 bg-stone-100 p-3">
        <iframe key={src} src={src} title="Draft preview" className="h-[75vh] rounded-lg bg-white shadow-sm" style={{ width: device === "phone" ? 390 : "100%" }} />
      </div>
      <p className="mt-2 text-xs text-stone-500">This is the agent&apos;s current draft, which may include changes they haven&apos;t published yet.</p>
    </div>
  );
}
