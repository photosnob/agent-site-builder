import type { Block } from "@/lib/blocks/schema";
import { LeadForm } from "./LeadForm";
import { ParallaxImage } from "./Parallax";
import { HeroMedia, anchorFor, facts, heroHasMedia, listingItems, paragraphs, type Ctx, type Of } from "./looks";

/**
 * Monument (bold, inspired by editorial agency sites: oversized capitals, an
 * oxblood statement band, a pinned hero the page slides over, stacked listing
 * cards) and Heritage (quiet luxury: spaced capitals, navy and copper, photos
 * that drift as you scroll). Return null to fall back to the classic layout.
 */

const DARK = (bg: string, text: string, muted: string, accent: string, accentText: string) =>
  ({ "--bg": bg, "--surface": "color-mix(in srgb, white 10%, transparent)", "--text": text, "--muted": muted, "--accent": accent, "--accent-text": accentText, background: bg, color: text }) as React.CSSProperties;

// ---------------------------------------------------------------- Monument

const caps = "site-heading uppercase tracking-[-0.035em] leading-[0.88]";
const tag = "text-[11px] font-bold uppercase tracking-[0.12em]";
const arrow = <span aria-hidden className="ml-2 inline-block">↗</span>;

function MHero({ b, ctx }: { b: Of<"hero">; ctx: Ctx }) {
  const p = b.props;
  const media = heroHasMedia(p, ctx.theme, ctx.headshot);
  return (
    <div className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden text-white" style={{ background: "#0b0b0b" }}>
      {media && <HeroMedia p={p} theme={ctx.theme} headshot={ctx.headshot} />}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/60 to-transparent" />
      <div className="site-container relative w-full pb-14 pt-40">
        {p.eyebrow && <p className={`${tag} mb-6 text-white/85`}>{p.eyebrow}</p>}
        <h1 className={`${caps} max-w-[14ch] text-[3.1rem] sm:text-[5.5rem] lg:text-[7.4rem]`} style={{ fontWeight: 800 }}>{p.headline}</h1>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
          {p.subheadline && <p className="look-serif max-w-md text-xl leading-snug text-white/90 sm:text-2xl">{p.subheadline}</p>}
          <div className="flex flex-wrap gap-2">
            <a href={anchorFor(p.ctaTarget)} className={`${tag} bg-white px-6 py-4 text-black transition hover:bg-white/85`}>{p.ctaLabel}{arrow}</a>
            {p.secondaryCtaLabel && p.secondaryCtaTarget && <a href={anchorFor(p.secondaryCtaTarget)} className={`${tag} border border-white/70 px-6 py-4 transition hover:bg-white hover:text-black`}>{p.secondaryCtaLabel}{arrow}</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MAbout({ b, ctx }: { b: Of<"about">; ctx: Ctx }) {
  const [lead, ...rest] = paragraphs(b.props.body);
  const img = b.props.image ?? ctx.headshot;
  return (
    <div id="about">
      <div style={{ background: "var(--accent)", color: "#ffffff" }} className="py-24 md:py-32">
        <div className="site-container">
          <p className={`${tag} mb-10 opacity-80`}>{b.props.headline}</p>
          {lead && <p className={`${caps} text-[2rem] leading-[0.95] sm:text-5xl lg:text-[4.2rem]`} style={{ fontWeight: 800 }}>{lead}</p>}
        </div>
      </div>
      {(rest.length > 0 || img) && (
        <div className="site-container grid items-end gap-12 py-24 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:py-32">
          {img && (
            <figure>
              <ParallaxImage src={img} alt={ctx.agent.name ?? ""} className="aspect-[4/5]" speed={0.08} />
              <figcaption className={`${tag} mt-4`}>{ctx.agent.name}{ctx.agent.brokerage && <span className="opacity-60"> · {ctx.agent.brokerage}</span>}</figcaption>
            </figure>
          )}
          <div className="look-serif space-y-6 text-[1.7rem] leading-[1.15] sm:text-[2.4rem]">
            {(rest.length ? rest : [lead]).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}

function MStats({ b }: { b: Of<"stats"> }) {
  return (
    <div className="site-container pb-24">
      <dl className="grid gap-y-12 border-t sm:grid-cols-3" style={{ borderColor: "var(--text)" }}>
        {b.props.items.map((s, i) => (
          <div key={i} className="pt-6 sm:pr-8">
            <dd className="look-serif text-6xl leading-none sm:text-7xl">{s.value}</dd>
            <dt className={`${tag} mt-4 max-w-[22ch]`}>{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Listings as full-screen cards that stack on top of each other as you scroll. */
function MListings({ b, ctx }: { b: Of<"featured-listings">; ctx: Ctx }) {
  const items = listingItems(ctx.data, b);
  return (
    <div id="listings">
      <div className="site-container flex flex-wrap items-end justify-between gap-6 pb-10 pt-24">
        <h2 className={`${caps} text-5xl sm:text-7xl lg:text-[6.5rem]`} style={{ fontWeight: 800 }}>{b.props.headline}<sup className="ml-2 align-top text-base tracking-normal sm:text-xl">({String(items.length).padStart(2, "0")})</sup></h2>
        {b.props.intro && <p className="look-serif max-w-sm text-xl leading-snug" style={{ color: "var(--muted)" }}>{b.props.intro}</p>}
      </div>
      {items.length === 0 && <p className="site-container pb-16 text-sm" style={{ color: "var(--muted)" }}>Featured properties are coming soon.</p>}
      {items.map((l, i) => (
        <article key={i} className="look-stack relative flex h-[100svh] items-end overflow-hidden text-white" style={{ background: "#0b0b0b" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={l.image} alt={l.address} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-black/20" />
          {l.href && <a href={l.href} target="_blank" rel="noopener" className="absolute inset-0 z-10" aria-label={`View ${l.address}`} />}
          <div className="site-container relative w-full pb-12">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className={`${tag} mb-4`}><span className="bg-white px-2 py-1 text-black">{l.status.replace("-", " ")}</span> <span className="ml-3 opacity-80">{String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span></p>
                <h3 className={`${caps} max-w-[16ch] text-4xl sm:text-6xl`} style={{ fontWeight: 800 }}>{l.address}</h3>
              </div>
              <div className="sm:text-right">
                {l.price && <p className="look-serif text-4xl sm:text-5xl">{l.price}</p>}
                {facts(l) && <p className={`${tag} mt-2 opacity-80`}>{facts(l)}</p>}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function MNeighborhoods({ b }: { b: Of<"neighborhoods"> }) {
  return (
    <div id="areas" className="site-container py-24 md:py-32">
      <p className={`${tag} mb-8`}>{b.props.headline}</p>
      <ul className="border-t" style={{ borderColor: "var(--text)" }}>
        {b.props.items.map((n, i) => (
          <li key={i} className="grid items-center gap-6 border-b py-8 md:grid-cols-[minmax(0,6fr)_minmax(0,4fr)_160px]" style={{ borderColor: "color-mix(in srgb, var(--text) 25%, transparent)" }}>
            <h3 className={`${caps} text-4xl sm:text-6xl`} style={{ fontWeight: 800 }}>{n.name}</h3>
            <p className="look-serif text-xl leading-snug" style={{ color: "var(--muted)" }}>{n.blurb}</p>
            {n.image ? <ParallaxImage src={n.image} className="hidden aspect-[4/3] md:block" speed={0.1} /> : <span className="hidden md:block" />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MTestimonials({ b }: { b: Of<"testimonials"> }) {
  return (
    <div className="site-container py-24 md:py-32">
      <p className={`${tag} mb-12`}>{b.props.headline}</p>
      <div className="grid gap-16 md:grid-cols-2">
        {b.props.items.map((t, i) => (
          <figure key={i}>
            <blockquote className="look-serif text-3xl leading-[1.15] sm:text-[2.6rem]">“{t.quote}”</blockquote>
            <figcaption className={`${tag} mt-6`}>{t.author}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function MCta({ b }: { b: Of<"cta"> }) {
  const p = b.props;
  return (
    <div className="relative overflow-hidden py-28 text-white md:py-40" style={{ background: "var(--accent)" }}>
      {p.image && <><ParallaxImage src={p.image} className="!absolute inset-0" speed={0.15} /><div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--accent) 78%, transparent)" }} /></>}
      <div className="site-container relative">
        <h2 className={`${caps} text-5xl sm:text-7xl lg:text-[7rem]`} style={{ fontWeight: 800 }}>{p.headline}</h2>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
          <p className="look-serif max-w-lg text-2xl leading-snug">{p.body}</p>
          <a href={anchorFor(p.target)} className={`${tag} bg-white px-7 py-4 text-black`}>{p.buttonLabel}{arrow}</a>
        </div>
      </div>
    </div>
  );
}

function MContact({ b, ctx }: { b: Of<"contact">; ctx: Ctx }) {
  return (
    <div id="contact" className="py-24 md:py-32" style={DARK("#0b0b0b", "#f4f2ef", "#a8a39b", "#f4f2ef", "#0b0b0b")}>
      <div className="site-container grid gap-14 md:grid-cols-2">
        <div>
          <h2 className={`${caps} text-5xl sm:text-7xl`} style={{ fontWeight: 800 }}>{b.props.headline}</h2>
          <p className="look-serif mt-8 max-w-md text-2xl leading-snug opacity-80">{b.props.body}</p>
          <div className={`${tag} mt-10 space-y-3`}>
            {b.props.showPhone && ctx.agent.phone && <p><a href={`tel:${ctx.agent.phone}`} className="hover:underline">{ctx.agent.phone}</a></p>}
            {ctx.agent.email && <p><a href={`mailto:${ctx.agent.email}`} className="hover:underline">{ctx.agent.email}</a></p>}
          </div>
        </div>
        <LeadForm siteId={ctx.siteId} disabled={!ctx.interactive} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Heritage

const spaced = "site-heading uppercase tracking-[0.16em]";
const label = "text-[11px] uppercase tracking-[0.3em]";

function HHead({ eyebrow, headline, intro, light }: { eyebrow?: string; headline: string; intro?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && <p className={`${label} mb-5`} style={{ color: light ? undefined : "var(--accent)" }}>{eyebrow}</p>}
      <h2 className={`${spaced} text-2xl leading-snug sm:text-3xl`}>{headline}</h2>
      {intro && <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed" style={{ color: light ? undefined : "var(--muted)" }}>{intro}</p>}
    </div>
  );
}

function HHero({ b, ctx }: { b: Of<"hero">; ctx: Ctx }) {
  const p = b.props;
  const video = ctx.theme.heroStyle === "video" && p.videoUrl;
  const still = p.image ?? p.slides?.[0] ?? ctx.headshot;
  return (
    <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden text-center text-white" style={{ background: "#1e232d" }}>
      {video ? <HeroMedia p={p} theme={ctx.theme} headshot={ctx.headshot} /> : still && <ParallaxImage src={still} className="!absolute inset-0" speed={0.18} priority />}
      <div className="absolute inset-0 bg-black/30" />
      {/* The photo fades into the page below, as on gallery-style luxury sites. */}
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(to bottom, transparent, var(--bg))" }} />
      <div className="site-container relative pb-24 pt-32">
        {p.eyebrow && <p className={`${label} mb-6 text-white/85`}>{p.eyebrow}</p>}
        <h1 className={`${spaced} mx-auto max-w-4xl text-3xl leading-[1.25] sm:text-5xl`} style={{ fontWeight: 400 }}>{p.headline}</h1>
        {p.subheadline && <p className="mx-auto mt-6 max-w-xl text-lg font-light text-white/90">{p.subheadline}</p>}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href={anchorFor(p.ctaTarget)} className={`${label} px-7 py-4`} style={{ background: "var(--accent)", color: "var(--accent-text)" }}>{p.ctaLabel}</a>
          {p.secondaryCtaLabel && p.secondaryCtaTarget && <a href={anchorFor(p.secondaryCtaTarget)} className={`${label} border border-white/70 px-7 py-4 transition hover:bg-white/10`}>{p.secondaryCtaLabel}</a>}
        </div>
      </div>
    </div>
  );
}

function HAbout({ b, ctx }: { b: Of<"about">; ctx: Ctx }) {
  const img = b.props.image ?? ctx.headshot;
  return (
    <div id="about" className="site-container py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={ctx.agent.name ?? ""} className="mx-auto mb-8 h-36 w-36 rounded-full object-cover" />
        )}
        <p className={`${label} mb-5`} style={{ color: "var(--accent)" }}>{ctx.agent.brokerage ?? "About"}</p>
        <h2 className={`${spaced} text-2xl sm:text-3xl`}>{b.props.headline}</h2>
        <span aria-hidden className="mx-auto mt-8 block h-px w-16" style={{ background: "var(--accent)" }} />
        {paragraphs(b.props.body).map((p, i) => <p key={i} className="mt-6 text-lg font-light leading-relaxed" style={{ color: "var(--muted)" }}>{p}</p>)}
      </div>
    </div>
  );
}

function HStats({ b }: { b: Of<"stats"> }) {
  return (
    <div className="py-16 md:py-20" style={{ background: "var(--surface)" }}>
      <dl className="site-container grid gap-y-10 text-center sm:grid-cols-3">
        {b.props.items.map((s, i) => (
          <div key={i}>
            <dd className="site-heading text-4xl tracking-[0.06em] sm:text-5xl" style={{ color: "var(--accent)" }}>{s.value}</dd>
            <dt className={`${label} mt-3`}>{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HListings({ b, ctx }: { b: Of<"featured-listings">; ctx: Ctx }) {
  const items = listingItems(ctx.data, b);
  return (
    <div id="listings" className="py-20 md:py-28">
      <div className="site-container"><HHead eyebrow="Featured properties" headline={b.props.headline} intro={b.props.intro} /></div>
      {items.length === 0 && <p className="site-container mt-8 text-center text-sm" style={{ color: "var(--muted)" }}>Featured properties are coming soon.</p>}
      <div className="mt-14 space-y-2">
        {items.map((l, i) => (
          <article key={i} className="relative flex h-[72svh] min-h-[420px] items-end text-white">
            <ParallaxImage src={l.image} alt={l.address} className="!absolute inset-0" speed={0.12} />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
            {l.href && <a href={l.href} target="_blank" rel="noopener" className="absolute inset-0 z-10" aria-label={`View ${l.address}`} />}
            <span className="absolute right-0 top-6 px-4 py-2 text-sm font-medium capitalize" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>{l.status.replace("-", " ")}</span>
            <div className="site-container relative w-full pb-10">
              <h3 className={`${spaced} text-xl sm:text-2xl`}>{l.address}</h3>
              {facts(l) && <p className={`${label} mt-2 text-white/85`}>{facts(l)}</p>}
              {l.price && <p className="mt-2 text-lg tracking-[0.12em] text-white/90">{l.price}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function HNeighborhoods({ b }: { b: Of<"neighborhoods"> }) {
  return (
    <div id="areas" className="site-container py-20 md:py-28">
      <HHead eyebrow="Communities" headline={b.props.headline} />
      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {b.props.items.map((n, i) => (
          <div key={i} className="text-center">
            {n.image ? <ParallaxImage src={n.image} className="aspect-[3/4]" speed={0.1} /> : <div className="aspect-[3/4]" style={{ background: "var(--surface)" }} />}
            <h3 className={`${spaced} mt-6 text-lg`}>{n.name}</h3>
            <p className="mx-auto mt-2 max-w-xs font-light leading-relaxed" style={{ color: "var(--muted)" }}>{n.blurb}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HCta({ b }: { b: Of<"cta"> }) {
  const p = b.props;
  return (
    <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden py-24 text-center text-white" style={{ background: "#1e232d" }}>
      {p.image && <ParallaxImage src={p.image} className="!absolute inset-0" speed={0.18} />}
      <div className="absolute inset-0" style={{ background: "rgba(30,35,45,.62)" }} />
      <div className="site-container relative max-w-3xl">
        <h2 className={`${spaced} text-3xl leading-snug sm:text-4xl`}>{p.headline}</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg font-light text-white/90">{p.body}</p>
        <a href={anchorFor(p.target)} className={`${label} mt-9 inline-block px-8 py-4`} style={{ background: "var(--accent)", color: "var(--accent-text)" }}>{p.buttonLabel}</a>
      </div>
    </div>
  );
}

function HTestimonials({ b }: { b: Of<"testimonials"> }) {
  return (
    <div className="site-container py-20 md:py-28">
      <HHead eyebrow="Client stories" headline={b.props.headline} />
      <div className="mx-auto mt-12 grid max-w-5xl gap-12 md:grid-cols-2">
        {b.props.items.map((t, i) => (
          <figure key={i} className="text-center">
            <blockquote className="text-xl font-light leading-relaxed">“{t.quote}”</blockquote>
            <figcaption className={`${label} mt-5`} style={{ color: "var(--accent)" }}>{t.author}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function HContact({ b, ctx }: { b: Of<"contact">; ctx: Ctx }) {
  return (
    <div id="contact" className="py-20 md:py-28" style={DARK("#1e232d", "#ffffff", "#b8bec8", "#a56b3d", "#ffffff")}>
      <div className="site-container">
        <HHead eyebrow="Contact" headline={b.props.headline} intro={b.props.body} light />
        <div className="mx-auto mt-12 max-w-xl">
          <LeadForm siteId={ctx.siteId} disabled={!ctx.interactive} />
          <div className={`${label} mt-8 flex flex-wrap justify-center gap-6`}>
            {b.props.showPhone && ctx.agent.phone && <a href={`tel:${ctx.agent.phone}`}>{ctx.agent.phone}</a>}
            {ctx.agent.email && <a href={`mailto:${ctx.agent.email}`}>{ctx.agent.email}</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LookBlock2({ block, ctx }: { block: Block; ctx: Ctx }): React.ReactElement | null {
  if (ctx.look === "monument") {
    switch (block.type) {
      case "hero": return <MHero b={block} ctx={ctx} />;
      case "about": return <MAbout b={block} ctx={ctx} />;
      case "stats": return <MStats b={block} />;
      case "featured-listings": return <MListings b={block} ctx={ctx} />;
      case "neighborhoods": return <MNeighborhoods b={block} />;
      case "testimonials": return ctx.data.testimonials.length ? null : <MTestimonials b={block} />;
      case "cta": return <MCta b={block} />;
      case "contact": return <MContact b={block} ctx={ctx} />;
      default: return null;
    }
  }
  if (ctx.look === "heritage") {
    switch (block.type) {
      case "hero": return <HHero b={block} ctx={ctx} />;
      case "about": return <HAbout b={block} ctx={ctx} />;
      case "stats": return <HStats b={block} />;
      case "featured-listings": return <HListings b={block} ctx={ctx} />;
      case "neighborhoods": return <HNeighborhoods b={block} />;
      case "testimonials": return ctx.data.testimonials.length ? null : <HTestimonials b={block} />;
      case "cta": return <HCta b={block} />;
      case "contact": return <HContact b={block} ctx={ctx} />;
      default: return null;
    }
  }
  return null;
}
