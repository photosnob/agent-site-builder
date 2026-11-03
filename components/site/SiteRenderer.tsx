import type { Block, SiteContent } from "@/lib/blocks/schema";
import type { Theme } from "@/lib/blocks/theme";
import type { AgentProfile } from "@/lib/types";
import { LeadForm } from "./LeadForm";
import { SiteShell } from "./SiteShell";

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
}: {
  content: SiteContent;
  theme: Theme;
  agent: Agent;
  siteId: string;
  interactive?: boolean;
  headshot?: string;
  /** Public path prefix ("" on the agent's own domain, "/s/slug" otherwise). Omit in previews. */
  base?: string;
  hasBlog?: boolean;
}) {
  const blocks = content.blocks;
  return (
    <SiteShell
      theme={theme}
      agent={agent}
      base={base}
      hasBlog={hasBlog}
      sections={{ listings: blocks.some((b) => b.type === "featured-listings"), about: blocks.some((b) => b.type === "about") }}
    >
      {blocks.map((b) => (
        <section key={b.id} data-block-id={b.id} data-block-type={b.type}>
          <BlockView block={b} theme={theme} agent={agent} siteId={siteId} interactive={interactive} headshot={headshot} />
        </section>
      ))}
    </SiteShell>
  );
}

function BlockView({ block: b, theme, agent, siteId, interactive, headshot }: {
  block: Block; theme: Theme; agent: Agent; siteId: string; interactive: boolean; headshot?: string;
}) {
  switch (b.type) {
    case "hero": {
      const img = b.props.image ?? headshot;
      const Cta = (
        <a href={anchorFor(b.props.ctaTarget)} className="site-btn mt-8 inline-block">{b.props.ctaLabel}</a>
      );
      if (theme.heroStyle === "full-bleed" && img) {
        return (
          <div className="relative flex min-h-[78vh] items-end overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
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
    case "featured-listings":
      return (
        <div id="listings" className="py-16 md:py-24" style={{ background: "var(--surface)" }}>
          <div className="site-container">
            <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
            {b.props.intro && <p className="mt-3 max-w-2xl" style={{ color: "var(--muted)" }}>{b.props.intro}</p>}
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {b.props.items.map((l, i) => (
                <article key={i} className="overflow-hidden" style={{ background: "var(--bg)", borderRadius: "var(--radius)" }}>
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
            {b.props.items.length === 0 && (
              <p className="mt-8 text-sm" style={{ color: "var(--muted)" }}>Listings will appear here once your MLS feed is connected.</p>
            )}
          </div>
        </div>
      );
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
