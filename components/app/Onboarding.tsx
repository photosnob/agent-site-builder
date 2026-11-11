"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/templates";
import { TemplateThumb } from "./TemplateThumb";
import type { ScrapeResult } from "@/lib/import/scrape";
import type { SiteAsset, SiteRow } from "@/lib/types";
import { prepareImage } from "@/components/manage/resize";

const SPECIALTIES = ["Luxury", "First-time buyers", "Mid-century / architectural", "Waterfront", "Condos & lofts", "Investors", "Relocation", "New construction", "Land & ranch", "55+ communities"];
const STEPS = ["Profile", "Your market", "Import", "Design", "Build"];

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error([data.error || "Something went wrong", data.detail && `(Admin detail: ${data.detail})`].filter(Boolean).join(" "));
  return data;
}

export function Onboarding({ site, email, initialAssets }: { site: SiteRow | null; email: string; initialAssets: SiteAsset[] }) {
  const router = useRouter();
  const a = site?.agent ?? {};
  const [step, setStep] = useState(Math.min(Math.max(site?.onboarding_step ?? 1, 1), 5));
  const [siteId, setSiteId] = useState(site?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [profile, setProfile] = useState({
    name: a.name ?? "", email: a.email ?? email, phone: a.phone ?? "", brokerage: a.brokerage ?? "",
    licenseNumber: a.licenseNumber ?? "", licenseState: a.licenseState ?? "CA",
  });
  const [market, setMarket] = useState({
    serviceAreas: (a.serviceAreas ?? []).join(", "),
    specialties: a.specialties ?? ([] as string[]),
    yearsExperience: a.yearsExperience?.toString() ?? "",
    claims: a.claims?.length ? a.claims : [{ value: "", label: "" }],
    tone: a.tone ?? "warm",
    bio: a.bio ?? "",
    existingSiteUrl: a.existingSiteUrl ?? "",
  });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  async function saveProfile() {
    await run(async () => {
      const { id } = await api("/api/sites", "POST", {
        ...profile,
        serviceAreas: market.serviceAreas.split(",").map((s) => s.trim()).filter(Boolean),
        specialties: market.specialties,
        yearsExperience: market.yearsExperience ? Number(market.yearsExperience) : undefined,
        claims: market.claims.filter((c) => c.value.trim() && c.label.trim()),
        tone: market.tone,
        bio: market.bio,
        existingSiteUrl: market.existingSiteUrl,
      });
      setSiteId(id);
      setStep(3);
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <ol className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-full px-3 py-1 ${i + 1 === step ? "bg-stone-900 text-white" : i + 1 < step ? "bg-stone-200 text-stone-700" : "bg-stone-100 text-stone-400"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {error && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {step === 1 && (
        <section className="mt-8 space-y-5">
          <h1 className="text-3xl font-bold">Let&apos;s start with you</h1>
          <p className="text-stone-600">Your license number and brokerage appear in your site footer. They&apos;re locked from AI edits.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
            <Field label="Public email" type="email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} />
            <Field label="Phone" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} />
            <Field label="Brokerage" value={profile.brokerage} onChange={(v) => setProfile({ ...profile, brokerage: v })} />
            <Field label="License number" value={profile.licenseNumber} onChange={(v) => setProfile({ ...profile, licenseNumber: v })} />
            <Field label="License state" value={profile.licenseState} maxLength={2} onChange={(v) => setProfile({ ...profile, licenseState: v.toUpperCase() })} />
          </div>
          <button className="btn" disabled={!profile.name || !profile.brokerage || !profile.licenseNumber} onClick={() => setStep(2)}>Continue</button>
        </section>
      )}

      {step === 2 && (
        <section className="mt-8 space-y-5">
          <h1 className="text-3xl font-bold">Your market</h1>
          <Field label="Cities or neighborhoods you serve (comma-separated)" value={market.serviceAreas} placeholder="Willow Glen, Palo Alto, Sunnyvale" onChange={(v) => setMarket({ ...market, serviceAreas: v })} />
          <div>
            <span className="label">Specialties</span>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => {
                const on = market.specialties.includes(s);
                return (
                  <button key={s} type="button" onClick={() => setMarket({ ...market, specialties: on ? market.specialties.filter((x) => x !== s) : [...market.specialties, s] })}
                    className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Years in real estate" type="number" value={market.yearsExperience} onChange={(v) => setMarket({ ...market, yearsExperience: v })} />
            <div>
              <span className="label">Tone</span>
              <select className="input" value={market.tone} onChange={(e) => setMarket({ ...market, tone: e.target.value as "warm" })}>
                <option value="warm">Warm and approachable</option>
                <option value="polished">Polished and understated</option>
                <option value="bold">Bold and energetic</option>
              </select>
            </div>
          </div>
          <div>
            <span className="label">Numbers you want to show (optional)</span>
            <p className="mb-2 text-xs text-stone-500">Only stats you enter here can appear on your site. The AI won&apos;t invent any.</p>
            {market.claims.map((c, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input className="input w-32" placeholder="$120M" value={c.value} onChange={(e) => { const claims = [...market.claims]; claims[i] = { ...c, value: e.target.value }; setMarket({ ...market, claims }); }} />
                <input className="input" placeholder="in career sales" value={c.label} onChange={(e) => { const claims = [...market.claims]; claims[i] = { ...c, label: e.target.value }; setMarket({ ...market, claims }); }} />
              </div>
            ))}
            {market.claims.length < 3 && <button type="button" className="text-sm underline" onClick={() => setMarket({ ...market, claims: [...market.claims, { value: "", label: "" }] })}>Add another</button>}
          </div>
          <div>
            <label className="label" htmlFor="bio">Short bio (optional — we can pull it from your site)</label>
            <textarea id="bio" className="input" rows={4} maxLength={2000} value={market.bio} onChange={(e) => setMarket({ ...market, bio: e.target.value })} />
          </div>
          <Field label="Current website (optional)" placeholder="https://yourname.com" value={market.existingSiteUrl} onChange={(v) => setMarket({ ...market, existingSiteUrl: v })} />
          <div className="flex gap-3">
            <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn" disabled={busy || !market.serviceAreas.trim()} onClick={saveProfile}>{busy ? "Saving…" : "Continue"}</button>
          </div>
        </section>
      )}

      {step === 3 && siteId && (
        <ImportStep siteId={siteId} agentName={profile.name || a.name || ""} defaultUrl={market.existingSiteUrl} initialAssets={initialAssets}
          onDone={() => run(async () => { await api(`/api/sites/${siteId}`, "PATCH", { onboardingStep: 4 }); setStep(4); })} />
      )}

      {step === 4 && siteId && (
        <section className="mt-8">
          <h1 className="text-3xl font-bold">Pick a design</h1>
          <p className="mt-2 text-stone-600">You can switch colors and fonts later by asking.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {TEMPLATE_LIST.map((t) => (
              <button key={t.id} disabled={busy} onClick={() => run(async () => { await api(`/api/sites/${siteId}`, "PATCH", { template: t.id as TemplateId, onboardingStep: 5 }); setStep(5); })}
                className="overflow-hidden rounded-xl border border-stone-200 bg-white text-left hover:border-stone-900">
                <TemplateThumb t={t} />
                <div className="p-4">
                  <p className="font-semibold">{t.name}</p>
                  <p className="mt-1 text-sm text-stone-500">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 5 && siteId && (
        <section className="mt-8 space-y-4">
          <h1 className="text-3xl font-bold">Build your site</h1>
          <p className="text-stone-600">We&apos;ll write your copy from your answers and assemble the pages. It takes about 20–40 seconds.</p>
          <div className="flex gap-3">
            <button className="btn-ghost" onClick={() => setStep(4)}>Change design</button>
            <button className="btn" disabled={busy} onClick={() => run(async () => { await api(`/api/sites/${siteId}/generate`, "POST"); router.push("/dashboard"); })}>
              {busy ? "Building…" : "Build my site"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, maxLength }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; maxLength?: number }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" type={type} value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

type Scan = ScrapeResult & { host: string };
type ListingPick = { on: boolean; address: string; price: string; status: string };

function hostOf(u: string) { try { return new URL(u).host.replace(/^www\./, ""); } catch { return u; } }

/**
 * Scan one or more sites (the agent's own site, a brokerage profile page, etc.).
 * Each scan adds to what's already found; nothing is lost when another site is
 * scanned, and every item can be switched off before importing.
 */
function ImportStep({ siteId, agentName: _agentName, defaultUrl, initialAssets, onDone }: { siteId: string; agentName: string; defaultUrl: string; initialAssets: SiteAsset[]; onDone: () => void }) {
  const [url, setUrl] = useState(defaultUrl);
  const [scans, setScans] = useState<Scan[]>([]);
  const [headshot, setHeadshot] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [listings, setListings] = useState<Record<string, ListingPick>>({});
  const [bioFrom, setBioFrom] = useState<string | null>(null);
  const [testimonialsOff, setTestimonialsOff] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(initialAssets.some((x) => x.kind === "headshot"));

  // Everything found so far, de-duplicated across scans (first site to find an image keeps it).
  const seen = new Set<string>();
  const allHeadshots = scans.flatMap((s) => s.headshots.filter((h) => !seen.has(h.url) && seen.add(h.url)));
  const seenL = new Set<string>();
  const allListings = scans.flatMap((s) => s.listings.filter((l) => !seenL.has(l.url) && seenL.add(l.url)).map((l) => ({ ...l, host: s.host })));
  const logos = [...new Set(scans.map((s) => s.logo).filter((l): l is string => Boolean(l)))];
  const bios = scans.filter((s) => s.bio).map((s) => ({ src: s.sourceUrl, host: s.host, text: s.bio! }));
  const seenQ = new Set<string>();
  const allTestimonials = scans.flatMap((s) => s.testimonials
    .filter((t) => { const k = t.quote.trim().toLowerCase(); return !seenQ.has(k) && seenQ.add(k); })
    .map((t) => ({ ...t, key: t.quote.trim().toLowerCase(), host: s.host })));
  const pickedCount = allListings.filter((l) => listings[l.url]?.on).length;
  const anything = scans.length > 0;

  async function doScan() {
    setBusy(true); setMsg(null);
    try {
      const r: ScrapeResult = await api(`/api/sites/${siteId}/import`, "POST", { url });
      const scan: Scan = { ...r, host: hostOf(r.sourceUrl) };
      // Rescanning the same site replaces its results; any other site is added alongside.
      setScans((prev) => [...prev.filter((s) => s.sourceUrl !== r.sourceUrl), scan]);
      setHeadshot((h) => h ?? r.headshots[0]?.url ?? null);
      setLogo((l) => l ?? r.logo ?? null);
      setBioFrom((b) => b ?? (r.bio ? r.sourceUrl : null));
      setListings((prev) => {
        const next = { ...prev };
        let on = Object.values(prev).filter((v) => v.on).length;
        for (const l of r.listings) {
          if (next[l.url]) continue; // keep the agent's edits for photos already found
          next[l.url] = { on: on < 6, address: l.address ?? "", price: l.price ?? "", status: l.status ?? "sold" };
          if (on < 6) on++;
        }
        return next;
      });
      const found = [r.headshots.length && `${r.headshots.length} headshot option${r.headshots.length === 1 ? "" : "s"}`, r.listings.length && `${r.listings.length} listing photo${r.listings.length === 1 ? "" : "s"}`, r.bio && "a bio", r.testimonials.length && `${r.testimonials.length} testimonial${r.testimonials.length === 1 ? "" : "s"}`].filter(Boolean);
      setMsg([found.length ? `${hostOf(r.sourceUrl)}: found ${found.join(", ")}. Scan another site to add more.` : `We read ${hostOf(r.sourceUrl)} but couldn't spot a headshot or listings.`, ...r.notes].join(" "));
      setUrl("");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  function removeScan(src: string) {
    const gone = scans.find((s) => s.sourceUrl === src);
    const rest = scans.filter((s) => s.sourceUrl !== src);
    setScans(rest);
    if (!gone) return;
    const stillFound = new Set(rest.flatMap((s) => [...s.headshots.map((h) => h.url), ...s.listings.map((l) => l.url), s.logo ?? ""]));
    if (headshot && !stillFound.has(headshot)) setHeadshot(rest.flatMap((s) => s.headshots)[0]?.url ?? null);
    if (logo && !stillFound.has(logo)) setLogo(rest.find((s) => s.logo)?.logo ?? null);
    if (bioFrom === src) setBioFrom(rest.find((s) => s.bio)?.sourceUrl ?? null);
    setListings((prev) => Object.fromEntries(Object.entries(prev).filter(([u]) => stillFound.has(u))));
  }

  const setListing = (u: string, patch: Partial<ListingPick>) => setListings((prev) => ({ ...prev, [u]: { ...prev[u], ...patch } }));
  const setAllListings = (on: boolean) => setListings((prev) => Object.fromEntries(Object.entries(prev).map(([u, v]) => [u, { ...v, on }])));

  async function upload(file: File, kind: "headshot" | "listing") {
    const fd = new FormData();
    fd.set("file", await prepareImage(file)); fd.set("kind", kind);
    const res = await fetch(`/api/sites/${siteId}/assets`, { method: "POST", body: fd });
    if (res.ok) { if (kind === "headshot") setUploaded(true); setMsg(`${kind === "headshot" ? "Headshot" : "Listing photo"} uploaded.`); }
    else setMsg((await res.json()).error);
  }

  async function confirm() {
    setBusy(true); setMsg(null);
    try {
      if (anything) {
        const picked = allListings.filter((l) => listings[l.url]?.on).map((l) => {
          const v = listings[l.url];
          return { url: l.url, address: v.address || undefined, price: v.price || undefined, status: v.status as "sold" };
        });
        await api(`/api/sites/${siteId}/assets`, "POST", { headshotUrl: uploaded ? undefined : headshot ?? undefined, logoUrl: logo ?? undefined, listings: picked });
        await api(`/api/sites/${siteId}`, "PATCH", {
          importData: {
            bio: bios.find((b) => b.src === bioFrom)?.text,
            testimonials: allTestimonials.filter((t) => !testimonialsOff.has(t.key)).map(({ quote, author }) => ({ quote, author })),
          },
        });
      }
      onDone();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  const tile = (on: boolean) => `relative overflow-hidden rounded-lg border-2 ${on ? "border-stone-900" : "border-transparent opacity-60 hover:opacity-100"}`;
  const tick = <span aria-hidden className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-[11px] text-white">✓</span>;

  return (
    <section className="mt-8 space-y-6">
      <h1 className="text-3xl font-bold">Bring in your assets</h1>
      <p className="text-stone-600">We&apos;ll read your current site and suggest a headshot, listing photos, your bio and testimonials. Scan as many sites as you like (your own site, your brokerage profile page); everything found adds up here, and you pick what comes over.</p>
      <div className="flex gap-2">
        <input className="input" placeholder={anything ? "Another site, e.g. your brokerage profile page" : "https://yourname.com"} value={url} onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && url && !busy) doScan(); }} />
        <button className="btn shrink-0" disabled={busy || !url} onClick={doScan}>{busy ? "Scanning…" : anything ? "Scan another" : "Scan site"}</button>
      </div>

      {scans.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Sites scanned">
          {scans.map((s) => (
            <li key={s.sourceUrl} className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-3 pr-1 text-sm">
              <span title={s.sourceUrl}>{s.host}</span>
              <span className="text-xs text-stone-500">{s.listings.length} photos</span>
              <button className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-900" onClick={() => removeScan(s.sourceUrl)} aria-label={`Remove everything found on ${s.host}`} title="Remove this site's results">✕</button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="text-sm text-stone-700">{msg}</p>}

      {anything && (
        <div className="space-y-8">
          {allHeadshots.length > 0 && !uploaded && (
            <div>
              <h2 className="font-semibold">Headshot</h2>
              <p className="text-xs text-stone-500">Pick one, or tap it again to use none.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {allHeadshots.map((h) => (
                  <button key={h.url} onClick={() => setHeadshot(headshot === h.url ? null : h.url)} aria-pressed={headshot === h.url} className={tile(headshot === h.url)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.url} alt={h.alt} className="h-28 w-28 object-cover" referrerPolicy="no-referrer" />
                    {headshot === h.url && tick}
                  </button>
                ))}
              </div>
            </div>
          )}

          {logos.length > 0 && (
            <div>
              <h2 className="font-semibold">Logo</h2>
              <p className="text-xs text-stone-500">Tap to choose, or tap again to skip. You can also upload one later in Settings.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {logos.map((l) => (
                  <button key={l} onClick={() => setLogo(logo === l ? null : l)} aria-pressed={logo === l} className={`${tile(logo === l)} bg-stone-100 p-2`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l} alt="" className="h-12 w-32 object-contain" referrerPolicy="no-referrer" />
                    {logo === l && tick}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allListings.length > 0 && (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">Listings to feature <span className="font-normal text-stone-500">({pickedCount} of {allListings.length} selected)</span></h2>
                <div className="flex gap-3 text-xs">
                  <button className="underline" onClick={() => setAllListings(true)}>Select all</button>
                  <button className="underline" onClick={() => setAllListings(false)}>Clear all</button>
                </div>
              </div>
              <p className="text-xs text-stone-500">Check the details. Only feature listings you represented, and follow your MLS&apos;s rules for sold data.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {allListings.map((l) => {
                  const v = listings[l.url];
                  return (
                    <div key={l.url} className={`flex gap-3 rounded-lg border bg-white p-2 ${v?.on ? "border-stone-900" : "border-stone-200"}`}>
                      <button type="button" onClick={() => setListing(l.url, { on: !v?.on })} aria-pressed={v?.on ?? false} aria-label={`${v?.on ? "Deselect" : "Select"} listing photo`} className={`relative shrink-0 ${v?.on ? "" : "opacity-50"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.url} alt="" className="h-20 w-24 rounded object-cover" referrerPolicy="no-referrer" />
                        {v?.on && tick}
                      </button>
                      <div className="min-w-0 flex-1 space-y-1">
                        <label className="flex items-center gap-2 text-xs font-semibold">
                          <input type="checkbox" checked={v?.on ?? false} onChange={(e) => setListing(l.url, { on: e.target.checked })} /> Feature
                          {scans.length > 1 && <span className="ml-auto truncate font-normal text-stone-400">{l.host}</span>}
                        </label>
                        <input className="input !py-1 text-xs" placeholder="Address" value={v?.address ?? ""} onChange={(e) => setListing(l.url, { address: e.target.value })} />
                        <div className="flex gap-1">
                          <input className="input !py-1 text-xs" placeholder="Price" value={v?.price ?? ""} onChange={(e) => setListing(l.url, { price: e.target.value })} />
                          <select className="input !py-1 text-xs" value={v?.status ?? "sold"} onChange={(e) => setListing(l.url, { status: e.target.value })}>
                            <option value="sold">Sold</option><option value="active">Active</option><option value="pending">Pending</option><option value="coming-soon">Coming soon</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {bios.length > 0 && (
            <fieldset>
              <legend className="font-semibold">Bio</legend>
              <div className="mt-2 space-y-2">
                {bios.map((b) => (
                  <label key={b.src} className={`block rounded-lg border bg-white p-4 text-sm ${bioFrom === b.src ? "border-stone-900" : "border-stone-200"}`}>
                    <span className="flex items-center gap-2 font-semibold"><input type="radio" name="bio" checked={bioFrom === b.src} onChange={() => setBioFrom(b.src)} /> Use the bio from {b.host}</span>
                    <span className="mt-2 block text-stone-600">{b.text.slice(0, 400)}{b.text.length > 400 ? "…" : ""}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 px-1 text-sm"><input type="radio" name="bio" checked={bioFrom === null} onChange={() => setBioFrom(null)} /> Don&apos;t import a bio</label>
              </div>
            </fieldset>
          )}

          {allTestimonials.length > 0 && (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">Testimonials found <span className="font-normal text-stone-500">({allTestimonials.length - allTestimonials.filter((t) => testimonialsOff.has(t.key)).length} selected)</span></h2>
                <div className="flex gap-3 text-xs">
                  <button className="underline" onClick={() => setTestimonialsOff(new Set())}>Select all</button>
                  <button className="underline" onClick={() => setTestimonialsOff(new Set(allTestimonials.map((t) => t.key)))}>Clear all</button>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {allTestimonials.map((t) => (
                  <label key={t.key} className="flex gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm">
                    <input type="checkbox" checked={!testimonialsOff.has(t.key)} onChange={(e) => setTestimonialsOff((prev) => { const n = new Set(prev); if (e.target.checked) n.delete(t.key); else n.add(t.key); return n; })} />
                    <span>“{t.quote}” <span className="text-stone-500">— {t.author}</span>{scans.length > 1 && <span className="ml-2 text-xs text-stone-400">{t.host}</span>}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-stone-300 p-4 text-sm">
        <p className="font-semibold">Or upload directly</p>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="cursor-pointer underline">Headshot<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "headshot")} /></label>
          <label className="cursor-pointer underline">Listing photo<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "listing")} /></label>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn-ghost" onClick={onDone} disabled={busy}>Skip for now</button>
        <button className="btn" onClick={confirm} disabled={busy || (!anything && !uploaded)}>{busy && anything ? "Importing…" : "Use these"}</button>
      </div>
    </section>
  );
}
