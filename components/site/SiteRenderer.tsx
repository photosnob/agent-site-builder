import type { AnyContent, Block } from "@/lib/blocks/schema";
import { EMPTY_DATA, listingsForBlock, type SiteData } from "@/lib/siteData";
import { HeroVideo } from "./HeroVideo";
import { Faq, Instagram, PageHeader, RecentPosts, Reviews, RichText, Steps, TeamGrid } from "./InnerBlocks";
import type { Theme } from "@/lib/blocks/theme";
import type { AgentProfile } from "@/lib/types";
import { LeadForm } from "./LeadForm";
import { HeroSlideshow } from "./HeroSlideshow";
import { SiteShell } from "./SiteShell";
import { LookBlock, heroHasMedia } from "./looks";

type Agent = Partial<AgentProfile>;

// Photo sizes for the About section. Fixed presets so every size still looks designed.
const ABOUT_LAYOUT = {
  small: { grid: "md:grid-cols-[1fr_3fr]", img: "mx-auto max-w-[220px] md:max-w-none" },
  medium: { grid: "md:grid-cols-[1fr_2fr]", img: "mx-auto max-w-[320px] md:max-w-none" },
  large: { grid: "md:grid-cols-[2fr_3fr]", img: "" },
} as const;

const anchorFor = (t: string) => (t === "listings" ? "#listings" : t === "valuation" ? "#contact?intent=valuation" : "#contact");

export function SiteRenderer({
  content,
  theme,
  agent,
  siteId,
  interactive = true,
  headshot,
  base,
  hasBlog = false,
  blogHref,
  data = EMPTY_DATA,
  logo,
}: {
  content: AnyContent;
  theme: Theme;
  agent: Agent;
  siteId: string;
  interactive?: boolean;
  headshot?: string;
  /** Public path prefix ("" on the agent's own domain, "/s/slug" otherwise). Omit in previews. */
  base?: string;
  hasBlog?: boolean;
  blogHref?: string;
  /** Listings, reviews, team, posts and nav pages for data-driven sections. */
  data?: SiteData;
  logo?: string;
}) {
  const blocks = content.blocks;
  const look = theme.look ?? "classic";
  const first = blocks[0]?.type === "hero" ? blocks[0] : null;
  const overlay = look === "classic"
    ? Boolean(first && (
        (theme.heroStyle === "video" && Boolean(first.props.videoUrl)) ||
        (theme.heroStyle === "slideshow" && (first.props.slides?.length ?? 0) > 0) ||
        ((theme.heroStyle === "full-bleed" || theme.heroStyle === "video" || theme.heroStyle === "slideshow") && Boolean(first.props.image || headshot))))
    : look !== "bright" && Boolean(first && heroHasMedia(first.props, theme, headshot));
  return (
    <SiteShell
      theme={theme}
      agent={agent}
      base={base}
      hasBlog={hasBlog}
      blogHref={blogHref}
      nav={data.nav}
      logo={logo}
      overlayHeader={overlay}
      sections={{ listings: blocks.some((b) => b.type === "featured-listings"), about: blocks.some((b) => b.type === "about") }}
    >
      {blocks.map((b) => (
        <section key={b.id} data-block-id={b.id} data-block-type={b.type}>
          {(look !== "classic" && <LookBlock block={b} ctx={{ look, theme, agent, siteId, interactive, headshot, data }} />) ||
            <BlockView block={b} theme={theme} agent={agent} siteId={siteId} interactive={interactive} headshot={headshot} data={data} base={base} />}
        </section>
      ))}
    </SiteShell>
  );
}

/** Full-screen video or slideshow hero with centered type, in the style of luxury agent sites. */
function ImmersiveHero({ b, theme, agent, poster }: { b: Extract<Block, { type: "hero" }>; theme: Theme; agent: Agent; poster?: string }) {
  const p = b.props;
  const stats = (agent.claims ?? []).filter((c) => c.value && c.label).slice(0, 4);
  const license = [agent.brokerage, agent.licenseNumber && `${agent.licenseState ?? ""} License #${agent.licenseNumber}`.trim()].filter(Boolean).join("  ·  ");
  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black text-white">
      {theme.heroStyle === "video" && p.videoUrl ? (
        <>
          <HeroVideo src={p.videoUrl} poster={poster} speed={p.videoSpeed ?? 1} className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {poster && <img src={poster} alt="" aria-hidden className="absolute inset-0 hidden h-full w-full object-cover motion-reduce:block" />}
        </>
      ) : (
        <HeroSlideshow images={p.slides ?? []} />
      )}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-linear-to-b from-black/50 via-transparent to-black/60" />
      <div className="site-container relative flex flex-1 flex-col items-center justify-center pb-24 pt-32 text-center">
        {p.eyebrow && <p className="mb-5 text-[11px] uppercase tracking-[0.35em] opacity-90 sm:text-xs">{p.eyebrow}</p>}
        <h1 className="site-heading max-w-5xl text-4xl uppercase leading-[1.1] tracking-[0.06em] sm:text-6xl lg:text-7xl" style={{ fontWeight: 500 }}>{p.headline}</h1>
        {p.subheadline && <p className="mt-6 max-w-2xl text-base opacity-90 sm:text-lg">{p.subheadline}</p>}
        {license && <p className="mt-4 text-[11px] uppercase tracking-[0.25em] opacity-75">{license}</p>}
        <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <a href={anchorFor(p.ctaTarget)} className="bg-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-900 transition hover:bg-white/85" style={{ borderRadius: "var(--radius)" }}>{p.ctaLabel}</a>
          {p.secondaryCtaLabel && p.secondaryCtaTarget && (
            <a href={anchorFor(p.secondaryCtaTarget)} className="border border-white/80 px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] transition hover:bg-white/10" style={{ borderRadius: "var(--radius)" }}>{p.secondaryCtaLabel}</a>
          )}
        </div>
      </div>
      {stats.length >= 2 && (
        <div className="relative border-t border-white/25 bg-black/25 backdrop-blur-sm">
          <dl className={`site-container grid grid-cols-2 gap-y-4 py-5 text-center ${({ 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as Record<number, string>)[stats.length]}`}>
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="site-heading text-2xl sm:text-3xl">{s.value}</dd>
                <dd className="mt-1 text-[10px] uppercase tracking-[0.2em] opacity-80">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function BlockView({ block: b, theme, agent, siteId, interactive, headshot, data, base }: {
  block: Block; theme: Theme; agent: Agent; siteId: string; interactive: boolean; headshot?: string; data: SiteData; base?: string;
}) {
  switch (b.type) {
    case "page-header": return <PageHeader b={b} />;
    case "rich-text": return <RichText b={b} />;
    case "steps": return <Steps b={b} />;
    case "faq": return <Faq b={b} />;
    case "team-grid": return <TeamGrid b={b} data={data} agent={agent} headshot={headshot} />;
    case "reviews": return <Reviews b={b} data={data} />;
    case "recent-posts": return <RecentPosts b={b} data={data} base={base} />;
    case "instagram": return <Instagram b={b} data={data} />;
    case "hero": {
      const img = b.props.image ?? headshot;
      if ((theme.heroStyle === "video" && b.props.videoUrl) || (theme.heroStyle === "slideshow" && (b.props.slides?.length ?? 0) > 0)) {
        return <ImmersiveHero b={b} theme={theme} agent={agent} poster={b.props.image ?? b.props.slides?.[0] ?? headshot} />;
      }
      const Cta = (
        <a href={anchorFor(b.props.ctaTarget)} className="site-btn mt-8 inline-block">{b.props.ctaLabel}</a>
      );
      if ((theme.heroStyle === "full-bleed" || theme.heroStyle === "video" || theme.heroStyle === "slideshow") && img) {
        return (
          <div className="relative flex min-h-[78vh] items-end overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-black/40" />
            <div className="site-container relative pb-16 text-white">
              {b.props.eyebrow && <p className="mb-3 text-sm uppercase tracking-[0.2em] opacity-80">{b.props.eyebrow}</p>}
              <h1 className="site-heading max-w-3xl text-4xl leading-tight sm:text-6xl">{b.props.headline}</h1>
              <p className="mt-5 max-w-xl text-lg opacity-90">{b.props.subheadline}</p>
              {Cta}
            </div>
          </div>
        );
      }
      if (theme.heroStyle === "split" && img) {
        return (
          <div className="site-container grid items-center gap-10 py-14 md:grid-cols-2 md:py-24">
            <div>
              {b.props.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>{b.props.eyebrow}</p>}
              <h1 className="site-heading text-4xl leading-tight sm:text-5xl">{b.props.headline}</h1>
              <p className="mt-5 text-lg" style={{ color: "var(--muted)" }}>{b.props.subheadline}</p>
              {Cta}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={agent.name ?? ""} className="aspect-[4/5] w-full object-cover" style={{ borderRadius: "var(--radius)" }} />
          </div>
        );
      }
      return (
        <div className="site-container py-20 text-center md:py-28">
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={agent.name ?? ""} className="mx-auto mb-8 h-36 w-36 rounded-full object-cover" />
          )}
          {b.props.eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>{b.props.eyebrow}</p>}
          <h1 className="site-heading mx-auto max-w-3xl text-4xl leading-tight sm:text-6xl">{b.props.headline}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg" style={{ color: "var(--muted)" }}>{b.props.subheadline}</p>
          {Cta}
        </div>
      );
    }
    case "about":
      return (
        <div id="about" className={`site-container grid items-start gap-10 py-16 md:py-24 ${ABOUT_LAYOUT[b.props.imageSize ?? "large"].grid}`}>
          {(b.props.image ?? headshot) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.props.image ?? headshot} alt={agent.name ?? ""} className={`aspect-square w-full object-cover ${ABOUT_LAYOUT[b.props.imageSize ?? "large"].img}`} style={{ borderRadius: "var(--radius)" }} />
          ) : <div />}
          <div>
            <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
            {b.props.body.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="mt-5 leading-relaxed" style={{ color: "var(--muted)" }}>{p}</p>
            ))}
          </div>
        </div>
      );
    case "featured-listings": {
      const manual = listingsForBlock(data);
      const items = manual.length
        ? manual.map((l) => ({ image: l.photos[0], address: [l.address, l.city].filter(Boolean).join(", "), price: l.price ?? undefined, status: l.status, beds: l.beds ?? undefined, baths: l.baths ?? undefined, sqft: l.sqft ?? undefined, href: l.link_url ?? undefined }))
        : b.props.items.map((l) => ({ ...l, href: undefined as string | undefined }));
      return (
        <div id="listings" className="py-16 md:py-24" style={{ background: "var(--surface)" }}>
          <div className="site-container">
            <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
            {b.props.intro && <p className="mt-3 max-w-2xl" style={{ color: "var(--muted)" }}>{b.props.intro}</p>}
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((l, i) => (
                <article key={i} className="relative overflow-hidden" style={{ background: "var(--bg)", borderRadius: "var(--radius)" }}>
                  {l.href && <a href={l.href} target="_blank" rel="noopener" className="absolute inset-0 z-10" aria-label={`View ${l.address}`} />}
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.image} alt={l.address} className="aspect-[4/3] w-full object-cover" />
                    <span className="absolute left-3 top-3 px-2 py-1 text-xs font-semibold uppercase" style={{ background: "var(--accent)", color: "var(--accent-text)", borderRadius: "var(--radius)" }}>
                      {l.status.replace("-", " ")}
                    </span>
                  </div>
                  <div className="p-5">
                    {l.price && <p className="site-heading text-xl">{l.price}</p>}
                    <p className="mt-1 text-sm">{l.address}</p>
                    {(l.beds || l.baths || l.sqft) && (
                      <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                        {[l.beds && `${l.beds} bd`, l.baths && `${l.baths} ba`, l.sqft && `${l.sqft.toLocaleString()} sq ft`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {items.length === 0 && (
              <p className="mt-8 text-sm" style={{ color: "var(--muted)" }}>Featured properties are coming soon.</p>
            )}
          </div>
        </div>
      );
    }
    case "neighborhoods":
      return (
        <div className="site-container py-16 md:py-24">
          <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {b.props.items.map((n, i) => (
              <div key={i} className="p-6" style={{ background: "var(--surface)", borderRadius: "var(--radius)" }}>
                <h3 className="site-heading text-xl">{n.name}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{n.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "testimonials":
      if (data.testimonials.length) {
        return <Reviews b={{ type: "reviews", id: b.id, props: { headline: b.props.headline, mode: "featured" } }} data={data} />;
      }
      return (
        <div className="py-16 md:py-24" style={{ background: "var(--surface)" }}>
          <div className="site-container">
            <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {b.props.items.map((t, i) => (
                <figure key={i} className="p-7" style={{ background: "var(--bg)", borderRadius: "var(--radius)" }}>
                  <blockquote className="text-lg leading-relaxed">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 text-sm font-semibold" style={{ color: "var(--muted)" }}>— {t.author}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      );
    case "stats":
      return (
        <div className="site-container grid grid-cols-2 gap-8 py-14 md:grid-cols-4">
          {b.props.items.map((s, i) => (
            <div key={i} className="text-center">
              <p className="site-heading text-4xl" style={{ color: "var(--accent)" }}>{s.value}</p>
              <p className="mt-1 text-sm uppercase tracking-wide" style={{ color: "var(--muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      );
    case "cta":
      return (
        <div className="site-container py-16">
          <div className="px-8 py-14 text-center" style={{ background: "var(--accent)", color: "var(--accent-text)", borderRadius: "var(--radius)" }}>
            <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-90">{b.props.body}</p>
            <a href={anchorFor(b.props.target)} className="mt-8 inline-block px-6 py-3 font-semibold" style={{ background: "var(--accent-text)", color: "var(--accent)", borderRadius: "var(--radius)" }}>
              {b.props.buttonLabel}
            </a>
          </div>
        </div>
      );
    case "contact":
      return (
        <div id="contact" className="site-container grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
            <p className="mt-4" style={{ color: "var(--muted)" }}>{b.props.body}</p>
            <div className="mt-6 space-y-1 text-sm">
              {b.props.showPhone && agent.phone && <p><a href={`tel:${agent.phone}`}>{agent.phone}</a></p>}
              {agent.email && <p><a href={`mailto:${agent.email}`}>{agent.email}</a></p>}
            </div>
          </div>
          <LeadForm siteId={siteId} disabled={!interactive} />
        </div>
      );
  }
}
