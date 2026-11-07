"use client";
import { useEffect, useMemo, useState } from "react";
import { PageShell, apiJson, useStatus } from "./shared";

type Item = { id: string; from_path: string; to_path: string; permanent: boolean; source: string; needs_review: boolean; shadowed: boolean };
type Dest = { path: string; label: string };

/** Old site URL → new page mapping. Applied when the old domain points at this site. */
export function RedirectsManager({ siteId, oldSiteUrl, liveOrigin }: { siteId: string; oldSiteUrl: string; liveOrigin: string | null }) {
  const base = `/api/sites/${siteId}/redirects`;
  const [items, setItems] = useState<Item[] | null>(null);
  const [dests, setDests] = useState<Dest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState(oldSiteUrl);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("/");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [filter, setFilter] = useState<"all" | "review">("all");
  const { busy, run, view } = useStatus();
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const d = await apiJson(base, "GET");
      setItems(d.items); setDests(d.destinations);
    } catch (e) { setLoadError((e as Error).message); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const review = items?.filter((i) => i.needs_review).length ?? 0;
  const shown = useMemo(() => (items ?? []).filter((i) => filter === "all" || i.needs_review), [items, filter]);

  if (loadError) return <PageShell title="Redirects" intro=""><p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{loadError}</p></PageShell>;

  return (
    <PageShell
      title="Redirects"
      intro="Send visitors and Google from your old website's pages to the right pages here, so you keep your search rankings and nobody hits a dead link. These take effect when your old domain points to your new site."
    >
      {view}
      {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">1. Find your old pages</h2>
        <p className="mt-1 text-sm text-stone-500">We read your old site&apos;s sitemap and suggest where each page should go. You can change any of them.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="input min-w-64 flex-1" placeholder="https://your-old-site.com" value={scanUrl} onChange={(e) => setScanUrl(e.target.value)} />
          <button className="btn" disabled={!!busy || !scanUrl.trim()} onClick={() => run("scan", async () => {
            setNotice(null);
            const r = await apiJson(`${base}/discover`, "POST", { url: scanUrl.trim() });
            await load();
            if (r.added) { setNotice(`Found ${r.scanned} pages${r.via === "links" ? " (from your home page's links; no sitemap found)" : ""} and added ${r.added} redirects.${r.review ? ` ${r.review} need a look.` : ""}`); if (r.review) setFilter("review"); }
            if (!r.added) throw new Error(r.scanned ? `Found ${r.scanned} pages; all of them already have redirects or exist on your new site.` : "We couldn't find any pages on that site. Paste your old URLs below instead.");
          }, undefined)}>{busy === "scan" ? "Scanning… (up to a minute)" : "Scan old site"}</button>
        </div>
        <button className="mt-3 text-sm text-stone-600 underline" onClick={() => setShowBulk((s) => !s)}>{showBulk ? "Hide" : "Or paste a list of old URLs"}</button>
        {showBulk && (
          <div className="mt-2 space-y-2">
            <textarea className="input h-36 font-mono text-xs" value={bulk} onChange={(e) => setBulk(e.target.value)}
              placeholder={"One per line: old URL, then where it should go\n/about-jane → /#about\nhttps://old-site.com/sellers-guide → /sell\n/blog/2019/spring-market, /blog"} />
            <p className="text-xs text-stone-500">Tip: in Google Search Console, Pages → export gives you every URL Google knows about.</p>
            <button className="btn-ghost" disabled={!!busy || !bulk.trim()} onClick={() => run("bulk", async () => {
              const r = await apiJson(base, "POST", { bulk });
              setBulk(""); await load();
              if (r.errors?.length) throw new Error(`Saved ${r.saved}. Skipped ${r.errors.length}: ${r.errors.slice(0, 3).join("; ")}`);
            }, "Saved.")}>{busy === "bulk" ? "Saving…" : "Add these"}</button>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">2. Check where each old page goes {items && <span className="font-normal text-stone-400">({items.length})</span>}</h2>
          {review > 0 && (
            <div className="flex gap-1 text-sm">
              <button className={`rounded-md px-2 py-1 ${filter === "all" ? "bg-stone-900 text-white" : "text-stone-600"}`} onClick={() => setFilter("all")}>All</button>
              <button className={`rounded-md px-2 py-1 ${filter === "review" ? "bg-amber-500 text-white" : "text-amber-700"}`} onClick={() => setFilter("review")}>Needs a look ({review})</button>
            </div>
          )}
        </div>
        {review > 0 && <p className="mt-1 text-sm text-amber-700">Pages marked &ldquo;Needs a look&rdquo; had no clear match, so they go to your home page or blog for now. Pick a better page, or confirm.</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 p-3">
          <input className="input min-w-48 flex-1 !py-1.5" placeholder="Old URL, e.g. /about-me" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-stone-400">→</span>
          <DestPicker dests={dests} value={to} onChange={setTo} />
          <button className="btn !py-1.5" disabled={!!busy || !from.trim()} onClick={() => run("add", async () => {
            await apiJson(base, "POST", { items: [{ from, to, permanent: true }] });
            setFrom(""); await load();
          }, "Redirect added.")}>Add</button>
        </div>

        {items === null ? <p className="mt-4 text-sm text-stone-500">Loading…</p> : shown.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">{items.length ? "Nothing needs a look." : "No redirects yet. Scan your old site above to get started."}</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <code className="min-w-0 flex-1 truncate text-stone-700" title={r.from_path}>{r.from_path}</code>
                <span className="text-stone-400">→</span>
                <DestPicker dests={dests} value={r.to_path} onChange={(v) => run("edit", async () => {
                  const d = await apiJson(base, "PATCH", { id: r.id, to: v });
                  setItems((xs) => xs!.map((x) => (x.id === r.id ? { ...x, ...d.item } : x)));
                })} />
                {r.needs_review && (
                  <button className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800" title="Keep this destination" onClick={() => run("ok", async () => {
                    await apiJson(base, "PATCH", { id: r.id, reviewed: true });
                    setItems((xs) => xs!.map((x) => (x.id === r.id ? { ...x, needs_review: false } : x)));
                  })}>Looks right</button>
                )}
                {r.shadowed && <span className="rounded bg-stone-100 px-2 py-1 text-xs text-stone-500" title="Your new site has a page at this address, so it shows instead of redirecting.">Page exists</span>}
                {liveOrigin && <a className="text-xs text-stone-400 underline" href={`${liveOrigin}${r.from_path}`} target="_blank" rel="noreferrer">Test</a>}
                <button className="text-xs text-stone-400 hover:text-red-600" aria-label={`Delete redirect from ${r.from_path}`} onClick={() => run("del", async () => {
                  await apiJson(base, "DELETE", { ids: [r.id] });
                  setItems((xs) => xs!.filter((x) => x.id !== r.id));
                })}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}

/** Choose a page on the new site, or type any path or URL. */
function DestPicker({ dests, value, onChange }: { dests: Dest[]; value: string; onChange: (v: string) => void }) {
  const known = dests.some((d) => d.path === value);
  const [custom, setCustom] = useState(!known && value !== "/");
  const [text, setText] = useState(value);
  if (custom) {
    return (
      <span className="flex items-center gap-1">
        <input className="input !w-56 !py-1.5" value={text} placeholder="/page or https://…" onChange={(e) => setText(e.target.value)}
          onBlur={() => text.trim() && text !== value && onChange(text.trim())} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        <button className="text-xs text-stone-500 underline" onClick={() => setCustom(false)}>List</button>
      </span>
    );
  }
  return (
    <select className="input !w-56 !py-1.5" value={known ? value : "/"} onChange={(e) => (e.target.value === "__custom" ? setCustom(true) : onChange(e.target.value))}>
      {dests.map((d) => <option key={d.path} value={d.path}>{d.label}</option>)}
      <option value="__custom">Other address…</option>
    </select>
  );
}
