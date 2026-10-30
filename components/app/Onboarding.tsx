"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PALETTES } from "@/lib/blocks/theme";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/templates";
import type { ScrapeResult } from "@/lib/import/scrape";
import type { SiteAsset, SiteRow } from "@/lib/types";

const SPECIALTIES = ["Luxury", "First-time buyers", "Mid-century / architectural", "Waterfront", "Condos & lofts", "Investors", "Relocation", "New construction", "Land & ranch", "55+ communities"];
const STEPS = ["Profile", "Your market", "Import", "Design", "Build"];

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
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
            {TEMPLATE_LIST.map((t) => {
              const p = PALETTES[t.theme.palette];
              return (
                <button key={t.id} disabled={busy} onClick={() => run(async () => { await api(`/api/sites/${siteId}`, "PATCH", { template: t.id as TemplateId, onboardingStep: 5 }); setStep(5); })}
                  className="overflow-hidden rounded-xl border border-stone-200 bg-white text-left hover:border-stone-900">
                  <div className="flex h-28 items-end gap-1 p-3" style={{ background: p.bg }}>
                    {[p.accent, p.surface, p.text, p.muted].map((c) => <span key={c} className="h-8 w-8 rounded" style={{ background: c }} />)}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{t.name}</p>
                    <p className="mt-1 text-sm text-stone-500">{t.description}</p>
                  </div>
                </button>
              );
            })}
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

function ImportStep({ siteId, agentName, defaultUrl, initialAssets, onDone }: { siteId: string; agentName: string; defaultUrl: string; initialAssets: SiteAsset[]; onDone: () => void }) {
  const [url, setUrl] = useState(defaultUrl);
  const [scan, setScan] = useState<ScrapeResult | null>(null);
  const [headshot, setHeadshot] = useState<string | null>(null);
  const [listings, setListings] = useState<Record<string, { on: boolean; address: string; price: string; status: string }>>({});
  const [keepTestimonials, setKeepTestimonials] = useState<number[]>([]);
  const [useBio, setUseBio] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(initialAssets.some((x) => x.kind === "headshot"));

  async function doScan() {
    setBusy(true); setMsg(null);
    try {
      const r: ScrapeResult = await api(`/api/sites/${siteId}/import`, "POST", { url });
      setScan(r);
      setHeadshot(r.headshots[0]?.url ?? null);
      setListings(Object.fromEntries(r.listings.map((l, i) => [l.url, { on: i < 6, address: l.address ?? "", price: l.price ?? "", status: l.status ?? "sold" }])));
      setKeepTestimonials(r.testimonials.map((_, i) => i));
      if (!r.headshots.length && !r.listings.length) setMsg("We read the site but couldn't spot a headshot or listings. Upload them below.");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  async function upload(file: File, kind: "headshot" | "listing") {
    const fd = new FormData();
    fd.set("file", file); fd.set("kind", kind);
    const res = await fetch(`/api/sites/${siteId}/assets`, { method: "POST", body: fd });
    if (res.ok) { if (kind === "headshot") setUploaded(true); setMsg(`${kind === "headshot" ? "Headshot" : "Listing photo"} uploaded.`); }
    else setMsg((await res.json()).error);
  }

  async function confirm() {
    setBusy(true); setMsg(null);
    try {
      if (scan) {
        const picked = Object.entries(listings).filter(([, v]) => v.on).map(([u, v]) => ({ url: u, address: v.address || undefined, price: v.price || undefined, status: v.status as "sold" }));
        await api(`/api/sites/${siteId}/assets`, "POST", { headshotUrl: uploaded ? undefined : headshot ?? undefined, logoUrl: scan.logo, listings: picked });
        await api(`/api/sites/${siteId}`, "PATCH", {
          importData: { bio: useBio ? scan.bio : undefined, testimonials: scan.testimonials.filter((_, i) => keepTestimonials.includes(i)) },
        });
      }
      onDone();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <section className="mt-8 space-y-6">
      <h1 className="text-3xl font-bold">Bring in your assets</h1>
      <p className="text-stone-600">We&apos;ll read your current site and suggest a headshot, listing photos, your bio and testimonials. You choose what comes over; we copy images to your library.</p>
      <div className="flex gap-2">
        <input className="input" placeholder="https://yourname.com" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn shrink-0" disabled={busy || !url} onClick={doScan}>{busy && !scan ? "Scanning…" : "Scan site"}</button>
      </div>
      {msg && <p className="text-sm text-stone-700">{msg}</p>}

      {scan && (
        <div className="space-y-8">
          {scan.headshots.length > 0 && !uploaded && (
            <div>
              <h2 className="font-semibold">Headshot</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {scan.headshots.map((h) => (
                  <button key={h.url} onClick={() => setHeadshot(h.url)} className={`overflow-hidden rounded-lg border-2 ${headshot === h.url ? "border-stone-900" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.url} alt={h.alt} className="h-28 w-28 object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {scan.listings.length > 0 && (
            <div>
              <h2 className="font-semibold">Listings to feature</h2>
              <p className="text-xs text-stone-500">Check the details. Only feature listings you represented, and follow your MLS&apos;s rules for sold data.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {scan.listings.map((l) => {
                  const v = listings[l.url];
                  return (
                    <div key={l.url} className={`flex gap-3 rounded-lg border bg-white p-2 ${v?.on ? "border-stone-900" : "border-stone-200"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.url} alt="" className="h-20 w-24 shrink-0 rounded object-cover" referrerPolicy="no-referrer" />
                      <div className="flex-1 space-y-1">
                        <label className="flex items-center gap-2 text-xs font-semibold">
                          <input type="checkbox" checked={v?.on ?? false} onChange={(e) => setListings({ ...listings, [l.url]: { ...v, on: e.target.checked } })} /> Feature
                        </label>
                        <input className="input !py-1 text-xs" placeholder="Address" value={v?.address ?? ""} onChange={(e) => setListings({ ...listings, [l.url]: { ...v, address: e.target.value } })} />
                        <div className="flex gap-1">
                          <input className="input !py-1 text-xs" placeholder="Price" value={v?.price ?? ""} onChange={(e) => setListings({ ...listings, [l.url]: { ...v, price: e.target.value } })} />
                          <select className="input !py-1 text-xs" value={v?.status ?? "sold"} onChange={(e) => setListings({ ...listings, [l.url]: { ...v, status: e.target.value } })}>
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
          {scan.bio && (
            <label className="block rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <span className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={useBio} onChange={(e) => setUseBio(e.target.checked)} /> Use my bio from this site</span>
              <span className="mt-2 block text-stone-600">{scan.bio.slice(0, 400)}{scan.bio.length > 400 ? "…" : ""}</span>
            </label>
          )}
          {scan.testimonials.length > 0 && (
            <div>
              <h2 className="font-semibold">Testimonials found</h2>
              <div className="mt-2 space-y-2">
                {scan.testimonials.map((t, i) => (
                  <label key={i} className="flex gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm">
                    <input type="checkbox" checked={keepTestimonials.includes(i)} onChange={(e) => setKeepTestimonials(e.target.checked ? [...keepTestimonials, i] : keepTestimonials.filter((x) => x !== i))} />
                    <span>“{t.quote}” <span className="text-stone-500">— {t.author}</span></span>
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
        <button className="btn" onClick={confirm} disabled={busy || (!scan && !uploaded)}>{busy && scan ? "Importing…" : "Use these"}</button>
      </div>
    </section>
  );
}
