import { DESCRIPTION_SOFT_LIMIT, TITLE_SOFT_LIMIT } from "@/lib/seo/schema";

/** Approximates how a page appears in Google results. */
export function SearchPreview({ url, title, description }: { url: string; title: string; description: string }) {
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  const display = url.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/").join(" › ");
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4" aria-label="Search result preview">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Search result preview</p>
      <p className="mt-2 truncate text-xs text-stone-600">{display}</p>
      <p className="mt-0.5 text-lg leading-snug text-[#1a0dab]">{clip(title || "Untitled", TITLE_SOFT_LIMIT + 2)}</p>
      <p className="mt-1 text-sm leading-relaxed text-stone-600">{clip(description || "Add a description so search engines don't pick one for you.", DESCRIPTION_SOFT_LIMIT + 2)}</p>
    </div>
  );
}

export function CharCount({ value, soft }: { value: string; soft: number }) {
  const over = value.length > soft;
  return <span className={`font-normal ${over ? "text-amber-700" : "text-stone-400"}`}>{value.length}/{soft}{over ? " · may be cut off in results" : ""}</span>;
}
