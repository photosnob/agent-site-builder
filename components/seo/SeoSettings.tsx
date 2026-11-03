"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSeo } from "@/lib/seo/schema";
import { CharCount, SearchPreview } from "./SearchPreview";

interface Props {
  siteId: string;
  live: boolean;
  origin: string;
  hostedRoot: boolean;
  initial: SiteSeo;
  defaults: { title: string; description: string };
  images: { id: string; url: string; kind: string }[];
  generatedLlms: string;
  postCount: number;
}

export function SeoSettings(p: Props) {
  const router = useRouter();
  const [f, setF] = useState({
    title: p.initial.title ?? "",
    description: p.initial.description ?? "",
    ogImage: p.initial.ogImage ?? "",
    noindex: p.initial.noindex ?? false,
    googleVerification: p.initial.googleVerification ?? "",
    llmsTxt: p.initial.llmsTxt ?? "",
  });
  const [images, setImages] = useState(p.images);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [llmsMode, setLlmsMode] = useState<"auto" | "custom">(p.initial.llmsTxt ? "custom" : "auto");
  const llmsFile = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); setMsg(null); };

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/sites/${p.siteId}/seo`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, llmsTxt: llmsMode === "custom" ? f.llmsTxt : "" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: data.error }); return; }
    setDirty(false);
    setMsg({ ok: true, text: p.live ? "Saved. Your live site uses these settings now." : "Saved. These apply once your site is published." });
    router.refresh();
  }

  async function uploadShareImage(file?: File) {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file); fd.set("kind", "other");
    const res = await fetch(`/api/sites/${p.siteId}/assets`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setMsg({ ok: false, text: data.error }); return; }
    setImages((list) => [...list, { id: data.asset.id, url: data.asset.url, kind: "other" }]);
    set("ogImage", data.asset.url);
  }

  async function loadLlmsFile(file?: File) {
    if (!file) return;
    if (file.size > 50_000) { setMsg({ ok: false, text: "llms.txt files must be under 50 KB." }); return; }
    set("llmsTxt", await file.text());
    setLlmsMode("custom");
  }

  const links = [
    { label: "sitemap.xml", href: `${p.origin}/sitemap.xml` },
    ...(p.hostedRoot ? [{ label: "robots.txt", href: `${p.origin}/robots.txt` }] : []),
    { label: "llms.txt", href: `${p.origin}/llms.txt` },
    ...(p.postCount ? [{ label: "RSS feed", href: `${p.origin}/blog/rss.xml` }] : []),
  ];

  return (
    <div className="mt-8 space-y-6 pb-24">
      <Section title="Search appearance" description="How your home page shows up in Google and when it's shared on social media. Blog posts have their own settings.">
        <div>
          <label className="label" htmlFor="seo-title">Site title <CharCount value={f.title} soft={60} /></label>
          <input id="seo-title" className="input" maxLength={120} value={f.title} placeholder={p.defaults.title} onChange={(e) => set("title", e.target.value)} />
          <p className="mt-1 text-xs text-stone-400">Tip: lead with what people search for, e.g. &quot;Willow Glen Eichler Homes | Theresa Lee, Compass&quot;.</p>
        </div>
        <div>
          <label className="label" htmlFor="seo-desc">Meta description <CharCount value={f.description} soft={160} /></label>
          <textarea id="seo-desc" className="input" rows={3} maxLength={300} value={f.description} placeholder={p.defaults.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <SearchPreview url={p.origin} title={f.title || p.defaults.title} description={f.description || p.defaults.description} />

        <div>
          <span className="label">Social share image</span>
          <p className="mb-2 text-xs text-stone-400">Shown when your site is shared on Facebook, LinkedIn, iMessage, etc. Wide photos (1200×630) work best. Defaults to your hero photo.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => set("ogImage", "")}
              className={`flex h-20 w-32 items-center justify-center rounded-lg border-2 text-xs ${!f.ogImage ? "border-stone-900" : "border-stone-200"} bg-stone-50 text-stone-500`}>
              Default
            </button>
            {images.map((img) => (
              <button key={img.id} type="button" onClick={() => set("ogImage", img.url)}
                className={`overflow-hidden rounded-lg border-2 ${f.ogImage === img.url ? "border-stone-900" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-20 w-32 object-cover" />
              </button>
            ))}
            <label className="flex h-20 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-500 hover:bg-white">
              + Upload
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadShareImage(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      </Section>

      <Section title="Indexing" description="Your sitemap, robots.txt and RSS feed are generated automatically and update whenever you publish.">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={f.noindex} onChange={(e) => set("noindex", e.target.checked)} />
          <span>
            <span className="font-medium">Hide my site from search engines</span>
            <span className="block text-xs text-stone-500">Adds &quot;noindex&quot; to every page and empties your sitemap. Useful while you&apos;re still setting up.</span>
          </span>
        </label>
        <div>
          <label className="label" htmlFor="gsc">Google Search Console verification <span className="font-normal text-stone-400">(optional)</span></label>
          <input id="gsc" className="input font-mono text-xs" value={f.googleVerification} placeholder='Paste the HTML tag or just the code, e.g. <meta name="google-site-verification" content="…" />'
            onChange={(e) => set("googleVerification", e.target.value)} />
          <p className="mt-1 text-xs text-stone-400">In Search Console, add your site as a URL-prefix property, choose &quot;HTML tag&quot;, and paste it here. Then submit your sitemap there.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {links.map((l) => <a key={l.label} href={l.href} target="_blank" className="rounded-full border border-stone-200 bg-white px-3 py-1 hover:border-stone-900">{l.label} ↗</a>)}
        </div>
        {!p.live && <p className="text-xs text-amber-700">These files go live once your site is published.</p>}
      </Section>

      <Section title="llms.txt" description="A plain-text summary that helps AI assistants like ChatGPT and Claude describe you accurately. We generate one from your site; you can replace it with your own.">
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => { setLlmsMode("auto"); setDirty(true); }} className={`rounded-full px-3 py-1 ${llmsMode === "auto" ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}>Auto-generated</button>
          <button type="button" onClick={() => { setLlmsMode("custom"); if (!f.llmsTxt) set("llmsTxt", p.generatedLlms); else setDirty(true); }}
            className={`rounded-full px-3 py-1 ${llmsMode === "custom" ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}>Custom</button>
          <button type="button" onClick={() => llmsFile.current?.click()} className="ml-auto text-sm font-semibold underline">Upload .txt or .md</button>
          <input ref={llmsFile} type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={(e) => { loadLlmsFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {llmsMode === "auto" ? (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-50 p-4 text-xs leading-relaxed text-stone-700">{p.generatedLlms}</pre>
        ) : (
          <>
            <textarea className="input font-mono text-xs leading-relaxed" rows={14} maxLength={50_000} value={f.llmsTxt} onChange={(e) => set("llmsTxt", e.target.value)} />
            <p className="text-xs text-stone-400">{f.llmsTxt.length.toLocaleString()} / 50,000 characters. Plain text or Markdown; served as-is at /llms.txt.</p>
          </>
        )}
      </Section>

      <div className="sticky bottom-0 -mx-6 flex items-center gap-3 border-t border-stone-200 bg-stone-50/95 px-6 py-3 backdrop-blur">
        <button className="btn" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save settings"}</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>}
        {!msg && dirty && <span className="text-sm text-stone-500">Unsaved changes</span>}
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </div>
      {children}
    </section>
  );
}
