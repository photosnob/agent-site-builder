import type { Block } from "@/lib/blocks/schema";
import type { Look, Theme } from "@/lib/blocks/theme";
import { listingsForBlock, type SiteData } from "@/lib/siteData";
import type { AgentProfile } from "@/lib/types";
import { HeroSlideshow } from "./HeroSlideshow";
import { HeroVideo } from "./HeroVideo";
import { LeadForm } from "./LeadForm";

/**
 * Section layouts for the non-classic looks (Noir, Riviera, Bright). Each look
 * reads the same block data as the classic layouts; only the presentation
 * differs. Returning null falls back to the classic layout for that block.
 */

type Agent = Partial<AgentProfile>;
type Of<T extends Block["type"]> = Extract<Block, { type: T }>;
type Ctx = { look: Exclude<Look, "classic">; theme: Theme; agent: Agent; siteId: string; interactive: boolean; headshot?: string; data: SiteData };

export const anchorFor = (t: string) => (t === "listings" ? "#listings" : t === "valuation" ? "#contact?intent=valuation" : "#contact");

/** Riviera's dark bands: fixed tokens so forms and text inside stay legible. */
const DARK_BAND = { "--bg": "#0d0d0d", "--surface": "#262421", "--text": "#f5f2ec", "--muted": "#a8a29a", "--accent": "#f5f2ec", "--accent-text": "#0d0d0d", background: "#0d0d0d", color: "#f5f2ec" } as React.CSSProperties;

export function listingItems(data: SiteData, b: Of<"featured-listings">) {
  const manual = listingsForBlock(data);
  return manual.length
    ? manual.map((l) => ({ image: l.photos[0], address: [l.address, l.city].filter(Boolean).join(", "), price: l.price ?? undefined, status: l.status, beds: l.beds ?? undefined, baths: l.baths ?? undefined, sqft: l.sqft ?? undefined, href: l.link_url ?? undefined }))
    : b.props.items.map((l) => ({ ...l, beds: undefined as number | undefined, baths: undefined as number | undefined, sqft: undefined as number | undefined, href: undefined as string | undefined }));
}

const facts = (l: { beds?: number; baths?: number; sqft?: number }) =>
  [l.beds && `${l.beds} beds`, l.baths && `${l.baths} baths`, l.sqft && `${l.sqft.toLocaleString()} sq ft`].filter(Boolean).join(" · ");

const paragraphs = (s: string) => s.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

/** Small uppercase label above a heading. */
function Eyebrow({ look, children, light }: { look: Ctx["look"]; children: React.ReactNode; light?: boolean }) {
  const color = light ? undefined : look === "noir" ? "var(--accent)" : "var(--muted)";
  const cls = look === "bright" ? "text-xs font-semibold" : "text-[11px] uppercase tracking-[0.32em]";
  return <p className={`mb-4 ${cls}`} style={{ color }}>{children}</p>;
}

/** Section heading in each look's voice. Bright folds the intro into a grey second half of the headline. */
function Head({ look, eyebrow, headline, intro, center }: { look: Ctx["look"]; eyebrow?: string; headline: string; intro?: string; center?: boolean }) {
  if (look === "bright") {
    return (
      <div className="max-w-4xl">
        {eyebrow && <Eyebrow look={look}>{eyebrow}</Eyebrow>}
        <h2 className="site-heading text-3xl leading-[1.08] sm:text-5xl">
          {headline}{intro && <span style={{ color: "var(--muted)" }}> {intro}</span>}
        </h2>
      </div>
    );
  }
  if (look === "riviera" || center) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        {eyebrow && <Eyebrow look={look}>{eyebrow}</Eyebrow>}
        <h2 className="site-heading text-4xl leading-[1.05] sm:text-6xl">{headline}</h2>
        {look === "riviera" && <span aria-hidden className="mx-auto mt-8 block h-12 w-px" style={{ background: "currentColor", opacity: 0.25 }} />}
        {intro && <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed" style={{ color: "var(--muted)" }}>{intro}</p>}
      </div>
    );
  }
  return (
    <div className="max-w-3xl">
      {eyebrow && <Eyebrow look={look}>{eyebrow}</Eyebrow>}
      <h2 className="site-heading text-3xl leading-tight sm:text-[2.6rem]">{headline}</h2>
      {intro && <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: "var(--muted)" }}>{intro}</p>}
    </div>
  );
}

/** Riviera italicizes the small joining words of a headline ("The Art *of* Living"). */
function RivieraTitle({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  const join = /^(of|and|&|in|for|to|by|with|at|the|on|your)$/i;
  return <>{words.map((w, i) => (i > 0 && i < words.length - 1 && join.test(w) ? <em key={i} className="font-light">{w}</em> : <span key={i}>{w}</span>))}</>;
}

/** Background media for a hero: video, slideshow or photo, whichever this site has. */
function HeroMedia({ p, theme, headshot }: { p: Of<"hero">["props"]; theme: Theme; headshot?: string }) {
  const poster = p.image ?? p.slides?.[0] ?? headshot;
  if (theme.heroStyle === "video" && p.videoUrl) {
    return (
      <>
        <HeroVideo src={p.videoUrl} poster={poster} speed={p.videoSpeed ?? 1} className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {poster && <img src={poster} alt="" aria-hidden className="absolute inset-0 hidden h-full w-full object-cover motion-reduce:block" />}
      </>
    );
  }
  if (theme.heroStyle === "slideshow" && (p.slides?.length ?? 0) > 0) return <HeroSlideshow images={p.slides!} />;
  // eslint-disable-next-line @next/next/no-img-element
  return poster ? <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null;
}

export const heroHasMedia = (p: Of<"hero">["props"], theme: Theme, headshot?: string) =>
  Boolean((theme.heroStyle === "video" && p.videoUrl) || (theme.heroStyle === "slideshow" && p.slides?.length) || p.image || headshot);

function Hero({ b, ctx }: { b: Of<"hero">; ctx: Ctx }) {
  const p = b.props;
  const { look, agent } = ctx;
  const media = heroHasMedia(p, ctx.theme, ctx.headshot);

  if (look === "bright") {
    return (
      <div className="site-container pb-6 pt-14 sm:pt-20">
        <div className="mx-auto max-w-5xl text-center">
          {p.eyebrow && <Eyebrow look={look}>{p.eyebrow}</Eyebrow>}
          <h1 className="site-heading text-[2.6rem] leading-[1.02] sm:text-7xl lg:text-[5.4rem]">{p.headline}</h1>
          {p.subheadline && <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl" style={{ color: "var(--muted)" }}>{p.subheadline}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={anchorFor(p.ctaTarget)} className="site-btn">{p.ctaLabel} <span aria-hidden>→</span></a>
            {p.secondaryCtaLabel && p.secondaryCtaTarget && <a href={anchorFor(p.secondaryCtaTarget)} className="site-btn-ghost">{p.secondaryCtaLabel}</a>}
          </div>
        </div>
        {media && (
          <div className="relative mt-12 aspect-[4/3] overflow-hidden sm:aspect-[16/8]" style={{ borderRadius: "calc(var(--radius) + 8px)" }}>
            <HeroMedia p={p} theme={ctx.theme} headshot={ctx.headshot} />
          </div>
        )}
      </div>
    );
  }

  const areas = (agent.serviceAreas ?? []).slice(0, 5);
  if (look === "noir") {
    return (
      <div className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden text-white" style={{ background: "#000" }}>
        <HeroMedia p={p} theme={ctx.theme} headshot={ctx.headshot} />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "linear-gradient(to bottom, transparent, var(--bg))" }} />
        <div className="site-container relative w-full pb-20 pt-40 sm:pb-24">
          {p.eyebrow && <p className="mb-5 text-[11px] uppercase tracking-[0.32em] text-white/85">{p.eyebrow}</p>}
          <h1 className="site-heading max-w-4xl text-[2.7rem] leading-[1.04] sm:text-7xl">{p.headline}</h1>
          {p.subheadline && <p className="mt-6 max-w-xl text-base font-light text-white/85 sm:text-lg">{p.subheadline}</p>}
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={anchorFor(p.ctaTarget)} className="bg-white px-7 py-4 text-[11px] font-medium uppercase tracking-[0.22em] text-black transition hover:bg-white/85">{p.ctaLabel}</a>
            {p.secondaryCtaLabel && p.secondaryCtaTarget && (
              <a href={anchorFor(p.secondaryCtaTarget)} className="border border-white/60 px-7 py-4 text-[11px] font-medium uppercase tracking-[0.22em] transition hover:bg-white/10">{p.secondaryCtaLabel}</a>
            )}
          </div>
          {areas.length > 1 && (
            <div className="mt-10 flex flex-wrap items-center gap-2 text-xs">
              <span className="mr-2 text-[10px] uppercase tracking-[0.3em] text-white/60">Areas</span>
              {areas.map((a) => <a key={a} href="#areas" className="border border-white/25 px-3 py-1.5 text-white/90 transition hover:border-white/60">{a}</a>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Riviera: centered cinematic title over film, then the page turns light.
  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden text-center text-white" style={{ background: "#0d0d0d" }}>
      <HeroMedia p={p} theme={ctx.theme} headshot={ctx.headshot} />
      <div className="absolute inset-0 bg-black/40" />
      <div className="site-container relative pb-28 pt-36">
        {p.eyebrow && <p className="mb-6 text-[11px] uppercase tracking-[0.45em] text-white/85">{p.eyebrow}</p>}
        <h1 className="site-heading mx-auto max-w-6xl text-[3.2rem] leading-[0.98] sm:text-8xl lg:text-[8.5rem]"><RivieraTitle text={p.headline} /></h1>
        {p.subheadline && <p className="mx-auto mt-8 max-w-xl text-lg font-light text-white/90">{p.subheadline}</p>}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a href={anchorFor(p.ctaTarget)} className="border border-white/80 px-8 py-4 text-[11px] uppercase tracking-[0.28em] transition hover:bg-white hover:text-black">{p.ctaLabel}</a>
          {p.secondaryCtaLabel && p.secondaryCtaTarget && (
            <a href={anchorFor(p.secondaryCtaTarget)} className="px-4 py-4 text-[11px] uppercase tracking-[0.28em] underline-offset-8 hover:underline">{p.secondaryCtaLabel}</a>
          )}
        </div>
      </div>
      <div aria-hidden className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-white/70">
        Scroll<span className="block h-10 w-px bg-white/50" />
      </div>
    </div>
  );
}

function About({ b, ctx }: { b: Of<"about">; ctx: Ctx }) {
  const { look, agent } = ctx;
  const img = b.props.image ?? ctx.headshot;
  const [lead, ...rest] = paragraphs(b.props.body);

  if (look === "noir") {
    return (
      <div id="about" className="site-container py-20 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="mb-6 text-[11px] uppercase tracking-[0.32em]" style={{ color: "var(--accent)" }}>{b.props.headline}</h2>
            {lead && <p className="site-heading text-2xl leading-snug sm:text-[2rem]">{lead}</p>}
            {rest.map((p, i) => <p key={i} className="mt-5 max-w-2xl leading-relaxed" style={{ color: "var(--muted)" }}>{p}</p>)}
          </div>
          {img && (
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={agent.name ?? ""} className="mx-auto h-44 w-44 rounded-full object-cover sm:h-56 sm:w-56" />
              {agent.name && <figcaption className="mt-4 text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--muted)" }}>{agent.name}</figcaption>}
            </figure>
          )}
        </div>
      </div>
    );
  }

  if (look === "riviera") {
    return (
      <div id="about" className="site-container py-24 md:py-32">
        <div className={`grid items-center gap-12 md:gap-20 ${img ? "md:grid-cols-[5fr_6fr]" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img && <img src={img} alt={agent.name ?? ""} className="aspect-[4/5] w-full object-cover" />}
          <div className={img ? "" : "mx-auto max-w-3xl text-center"}>
            <Eyebrow look={look}>About</Eyebrow>
            <h2 className="site-heading text-4xl leading-[1.05] sm:text-6xl"><RivieraTitle text={b.props.headline} /></h2>
            <span aria-hidden className={`mt-8 block h-12 w-px ${img ? "" : "mx-auto"}`} style={{ background: "currentColor", opacity: 0.25 }} />
            {paragraphs(b.props.body).map((p, i) => <p key={i} className="mt-6 text-lg font-light leading-relaxed" style={{ color: "var(--muted)" }}>{p}</p>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="about" className="site-container py-20 md:py-28">
      <div className={`grid items-start gap-12 ${img ? "md:grid-cols-[3fr_2fr]" : ""}`}>
        <div>
          <Eyebrow look={look}>About</Eyebrow>
          <h2 className="site-heading text-3xl leading-[1.12] sm:text-[2.75rem]">
            {b.props.headline}{lead && <span style={{ color: "var(--muted)" }}> {lead}</span>}
          </h2>
          {rest.map((p, i) => <p key={i} className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--muted)" }}>{p}</p>)}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && <img src={img} alt={agent.name ?? ""} className="aspect-[4/5] w-full object-cover" style={{ borderRadius: "calc(var(--radius) + 8px)" }} />}
      </div>
    </div>
  );
}

function Listings({ b, ctx }: { b: Of<"featured-listings">; ctx: Ctx }) {
  const { look } = ctx;
  const items = listingItems(ctx.data, b);
  const empty = items.length === 0 && <p className="site-container mt-8 text-sm" style={{ color: "var(--muted)" }}>Featured properties are coming soon.</p>;
  const cover = (l: (typeof items)[number]) => l.href && <a href={l.href} target="_blank" rel="noopener" className="absolute inset-0 z-10" aria-label={`View ${l.address}`} />;

  if (look === "noir") {
    return (
      <div id="listings" className="py-20 md:py-28">
        <div className="site-container flex flex-wrap items-end justify-between gap-4">
          <Head look={look} eyebrow="Featured properties" headline={b.props.headline} intro={b.props.intro} />
          {items.length > 1 && <p aria-hidden className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--muted)" }}>Scroll →</p>}
        </div>
        {empty}
        <div className="look-rail mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4" tabIndex={0} aria-label="Featured properties">
          {items.map((l, i) => (
            <article key={i} className="relative w-[82vw] shrink-0 snap-start sm:w-[440px] lg:w-[520px]">
              {cover(l)}
              <div className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.image} alt={l.address} className="aspect-[4/3] w-full object-cover transition duration-700 hover:scale-[1.03]" />
                <span className="absolute left-3 top-3 border border-white/40 bg-black/50 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white">{l.status.replace("-", " ")}</span>
              </div>
              {l.price && <p className="site-heading mt-5 text-2xl">{l.price}</p>}
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em]">{l.address}</p>
              {facts(l) && <p className="mt-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>{facts(l)}</p>}
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (look === "riviera") {
    return (
      <div id="listings" className="site-container py-24 md:py-32">
        <Head look={look} eyebrow="Signature selection" headline={b.props.headline} intro={b.props.intro} />
        {empty}
        <div className="mt-16 grid gap-x-10 gap-y-16 md:grid-cols-2">
          {items.map((l, i) => (
            <article key={i} className="group relative">
              {cover(l)}
              <div className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.image} alt={l.address} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
              </div>
              <h3 className="site-heading mt-6 text-2xl leading-snug sm:text-[1.7rem]">{l.address}</h3>
              <p className="mt-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--muted)" }}>
                {[l.status.replace("-", " "), facts(l), l.price].filter(Boolean).join("  ·  ")}
              </p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="listings" className="site-container py-20 md:py-28">
      <Head look={look} headline={b.props.headline} intro={b.props.intro} />
      {empty}
      <div className={`mt-12 grid gap-6 sm:grid-cols-2 ${items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {items.map((l, i) => (
          <article key={i} className="group relative">
            {cover(l)}
            <div className="relative overflow-hidden" style={{ borderRadius: "calc(var(--radius) + 4px)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.image} alt={l.address} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
              <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-black">{l.status.replace("-", " ")}</span>
            </div>
            {l.price && <p className="site-heading mt-4 text-xl">{l.price}</p>}
            <p className="mt-1 text-sm">{l.address}</p>
            {facts(l) && <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{facts(l)}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

function Neighborhoods({ b, ctx }: { b: Of<"neighborhoods">; ctx: Ctx }) {
  const { look } = ctx;
  const items = b.props.items;
  const withPhotos = items.some((n) => n.image);

  if (look === "noir") {
    return (
      <div id="areas" className="py-20 md:py-28">
        <div className="site-container"><Head look={look} eyebrow="Communities" headline={b.props.headline} /></div>
        <div className="mt-12">
          {items.map((n, i) => n.image ? (
            <div key={i} className="relative flex min-h-[62vh] items-end overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={n.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-black/10" />
              <div className={`site-container relative w-full pb-14 text-white ${i % 2 ? "text-right" : ""}`}>
                <h3 className="site-heading text-4xl sm:text-5xl">{n.name}</h3>
                <p className={`mt-3 max-w-md text-sm leading-relaxed text-white/80 ${i % 2 ? "ml-auto" : ""}`}>{n.blurb}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="site-container">
              <div className="grid gap-4 border-t py-8 sm:grid-cols-[1fr_1.4fr] sm:gap-10" style={{ borderColor: "color-mix(in srgb, var(--text) 15%, transparent)" }}>
                <h3 className="site-heading text-3xl sm:text-4xl">{n.name}</h3>
                <p className="leading-relaxed" style={{ color: "var(--muted)" }}>{n.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (look === "riviera") {
    return (
      <div id="areas" className="site-container py-24 md:py-32">
        <Head look={look} eyebrow="Where we work" headline={b.props.headline} />
        {withPhotos ? (
          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((n, i) => (
              <div key={i}>
                {n.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={n.image} alt="" className="aspect-[3/4] w-full object-cover" />
                  : <div className="flex aspect-[3/4] items-center justify-center" style={{ background: "var(--surface)" }}><span className="site-heading text-3xl">{n.name}</span></div>}
                <h3 className="site-heading mt-6 text-2xl">{n.name}</h3>
                <p className="mt-2 font-light leading-relaxed" style={{ color: "var(--muted)" }}>{n.blurb}</p>
              </div>
            ))}
          </div>
        ) : (
          <ol className="mx-auto mt-16 grid max-w-5xl gap-x-16 md:grid-cols-2">
            {items.map((n, i) => (
              <li key={i} className="border-t py-8" style={{ borderColor: "color-mix(in srgb, var(--text) 14%, transparent)" }}>
                <span className="text-[11px] tracking-[0.3em]" style={{ color: "var(--muted)" }}>{String(i + 1).padStart(2, "0")}</span>
                <h3 className="site-heading mt-3 text-3xl">{n.name}</h3>
                <p className="mt-3 font-light leading-relaxed" style={{ color: "var(--muted)" }}>{n.blurb}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div id="areas" className="site-container py-20 md:py-28">
      <Head look={look} headline={b.props.headline} />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((n, i) => (
          <div key={i} className="overflow-hidden" style={{ background: "var(--surface)", borderRadius: "calc(var(--radius) + 4px)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {n.image && <img src={n.image} alt="" className="aspect-[4/3] w-full object-cover" />}
            <div className="p-6">
              <h3 className="site-heading text-xl">{n.name}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{n.blurb}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stats({ b, ctx }: { b: Of<"stats">; ctx: Ctx }) {
  const { look } = ctx;
  const cols = ({ 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as Record<number, string>)[b.props.items.length] ?? "sm:grid-cols-4";
  if (look === "noir") {
    return (
      <div className="site-container pb-6">
        <dl className={`grid grid-cols-2 gap-x-8 gap-y-10 ${cols}`}>
          {b.props.items.map((s, i) => (
            <div key={i} className="border-t pt-6" style={{ borderColor: "color-mix(in srgb, var(--text) 18%, transparent)" }}>
              <dd className="site-heading text-4xl sm:text-5xl">{s.value}</dd>
              <dt className="mt-3 text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--accent)" }}>{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  if (look === "riviera") {
    return (
      <div className="site-container py-16">
        <dl className={`grid grid-cols-2 gap-y-10 text-center ${cols}`}>
          {b.props.items.map((s, i) => (
            <div key={i} className="px-4 sm:border-l first:border-l-0" style={{ borderColor: "color-mix(in srgb, var(--text) 14%, transparent)" }}>
              <dd className="site-heading text-5xl font-light">{s.value}</dd>
              <dt className="mt-3 text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--muted)" }}>{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  return (
    <div className="site-container py-12">
      <dl className={`grid grid-cols-2 gap-6 ${cols}`}>
        {b.props.items.map((s, i) => (
          <div key={i} className="p-6" style={{ background: "var(--surface)", borderRadius: "calc(var(--radius) + 4px)" }}>
            <dd className="site-heading text-5xl sm:text-6xl">{s.value}</dd>
            <dt className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Cta({ b, ctx }: { b: Of<"cta">; ctx: Ctx }) {
  const { look } = ctx;
  const p = b.props;
  if (look === "bright") {
    return (
      <div className="site-container py-12">
        <div className="relative flex min-h-[380px] items-end overflow-hidden p-8 text-white sm:p-14" style={{ background: "var(--accent)", borderRadius: "calc(var(--radius) + 12px)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.image && <><img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-black/10" /></>}
          <div className="relative max-w-2xl">
            <h2 className="site-heading text-4xl leading-[1.04] sm:text-6xl">{p.headline}</h2>
            <p className="mt-4 text-lg text-white/85">{p.body}</p>
            <a href={anchorFor(p.target)} className="mt-8 inline-block rounded-full bg-white px-6 py-3 font-semibold text-black">{p.buttonLabel} <span aria-hidden>→</span></a>
          </div>
        </div>
      </div>
    );
  }
  const band = look === "riviera" ? DARK_BAND : ({ background: "var(--surface)" } as React.CSSProperties);
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden py-24 text-center" style={p.image ? { color: "#fff", background: "#000" } : band}>
      {p.image && (
        <>
          {/* Fixed-attachment photo gives a gentle parallax on desktop. */}
          <div aria-hidden className="look-parallax absolute inset-0" style={{ backgroundImage: `url("${encodeURI(p.image)}")` }} />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}
      <div className="site-container relative max-w-3xl">
        {look === "riviera" ? (
          <h2 className="site-heading text-5xl italic leading-[1.02] sm:text-7xl"><span className="font-light">{p.headline}</span></h2>
        ) : (
          <h2 className="site-heading text-3xl uppercase leading-snug tracking-[0.08em] sm:text-4xl">{p.headline}</h2>
        )}
        <p className={`mx-auto mt-6 max-w-xl ${look === "riviera" ? "text-[11px] uppercase tracking-[0.32em] opacity-85" : "font-light opacity-85"}`}>{p.body}</p>
        <a href={anchorFor(p.target)} className={`mt-10 inline-block px-8 py-4 text-[11px] uppercase tracking-[0.28em] transition ${look === "riviera" ? "bg-white text-black hover:bg-white/85" : "border border-current hover:bg-white/10"}`}>{p.buttonLabel}</a>
      </div>
    </div>
  );
}

function Testimonials({ b, ctx }: { b: Of<"testimonials">; ctx: Ctx }) {
  const { look } = ctx;
  if (look === "riviera") {
    return (
      <div className="site-container py-24 md:py-32">
        <Head look={look} eyebrow="Kind words" headline={b.props.headline} />
        <div className="mx-auto mt-14 max-w-3xl space-y-14 text-center">
          {b.props.items.map((t, i) => (
            <figure key={i}>
              <blockquote className="site-heading text-2xl italic leading-snug sm:text-3xl">“{t.quote}”</blockquote>
              <figcaption className="mt-5 text-[11px] uppercase tracking-[0.3em]" style={{ color: "var(--muted)" }}>{t.author}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="site-container py-20 md:py-28">
      <Head look={look} eyebrow={look === "noir" ? "Client stories" : undefined} headline={b.props.headline} />
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {b.props.items.map((t, i) => (
          <figure key={i} className={look === "noir" ? "border-t pt-8" : "p-8"} style={look === "noir" ? { borderColor: "color-mix(in srgb, var(--text) 15%, transparent)" } : { background: "var(--surface)", borderRadius: "calc(var(--radius) + 4px)" }}>
            <blockquote className={look === "noir" ? "text-xl font-light leading-relaxed" : "text-xl font-medium leading-snug"}>“{t.quote}”</blockquote>
            <figcaption className={`mt-5 ${look === "noir" ? "text-[10px] uppercase tracking-[0.28em]" : "text-sm"}`} style={{ color: look === "noir" ? "var(--accent)" : "var(--muted)" }}>{t.author}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Contact({ b, ctx }: { b: Of<"contact">; ctx: Ctx }) {
  const { look, agent } = ctx;
  const details = (
    <div className="mt-8 space-y-2 text-sm">
      {b.props.showPhone && agent.phone && <p><a href={`tel:${agent.phone}`} className="underline-offset-4 hover:underline">{agent.phone}</a></p>}
      {agent.email && <p><a href={`mailto:${agent.email}`} className="underline-offset-4 hover:underline">{agent.email}</a></p>}
    </div>
  );
  if (look === "riviera") {
    return (
      <div id="contact" className="py-24 md:py-32" style={DARK_BAND}>
        <div className="site-container">
          <Head look={look} eyebrow="Enquire" headline={b.props.headline} intro={b.props.body} />
          <div className="mx-auto mt-14 max-w-xl">
            <LeadForm siteId={ctx.siteId} disabled={!ctx.interactive} />
            <div className="text-center">{details}</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div id="contact" className="site-container grid gap-12 py-20 md:grid-cols-2 md:py-28">
      <div>
        <Head look={look} eyebrow={look === "noir" ? "Let's connect" : "Contact"} headline={b.props.headline} />
        <p className={`mt-5 leading-relaxed ${look === "bright" ? "text-lg" : ""}`} style={{ color: "var(--muted)" }}>{b.props.body}</p>
        {details}
      </div>
      <LeadForm siteId={ctx.siteId} disabled={!ctx.interactive} />
    </div>
  );
}

/** The look's layout for a block, or null to use the classic layout. */
export function LookBlock({ block, ctx }: { block: Block; ctx: Ctx }): React.ReactElement | null {
  switch (block.type) {
    case "hero": return <Hero b={block} ctx={ctx} />;
    case "about": return <About b={block} ctx={ctx} />;
    case "featured-listings": return <Listings b={block} ctx={ctx} />;
    case "neighborhoods": return <Neighborhoods b={block} ctx={ctx} />;
    case "stats": return <Stats b={block} ctx={ctx} />;
    case "cta": return <Cta b={block} ctx={ctx} />;
    case "testimonials": return ctx.data.testimonials.length ? null : <Testimonials b={block} ctx={ctx} />;
    case "contact": return <Contact b={block} ctx={ctx} />;
    default: return null;
  }
}
