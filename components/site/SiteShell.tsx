import { FONT_PAIRS, themeVars, type Theme } from "@/lib/blocks/theme";
import type { NavPage } from "@/lib/siteData";
import type { AgentProfile } from "@/lib/types";
import { SocialLinks } from "./SocialLinks";

type Agent = Partial<AgentProfile>;

/**
 * Header, theme and compliance footer shared by every public page.
 * `base` is the public path prefix; undefined means "same page" (dashboard preview).
 * `overlayHeader` floats a transparent header over a full-screen hero.
 */
export function SiteShell({
  theme, agent, base, hasBlog, blogHref, nav = [], logo, overlayHeader = false, sections = { listings: true, about: true }, children,
}: {
  theme: Theme; agent: Agent; base?: string; hasBlog?: boolean;
  /** Where the Blog link goes when there's no base (dashboard preview links to the live blog). */
  blogHref?: string;
  nav?: NavPage[];
  logo?: string;
  overlayHeader?: boolean;
  sections?: { listings: boolean; about: boolean };
  children: React.ReactNode;
}) {
  const preview = base === undefined;
  const home = preview ? "" : base || "/";
  const anchor = (id: string) => `${home}#${id}`;
  const pageHref = (slug: string) => (preview ? "#" : `${base}/${slug}`);
  const links: { href: string; label: string; external?: boolean }[] = [
    ...nav.map((p) => ({ href: pageHref(p.slug), label: p.label })),
    ...(nav.length === 0 && sections.listings ? [{ href: anchor("listings"), label: "Listings" }] : []),
    ...(nav.length === 0 && sections.about ? [{ href: anchor("about"), label: "About" }] : []),
    ...(hasBlog && !preview ? [{ href: `${base}/blog`, label: "Blog" }] : []),
    ...(hasBlog && preview && blogHref ? [{ href: blogHref, label: "Blog", external: true }] : []),
  ];
  const brand = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={agent.name ?? "Home"} className={`h-10 w-auto max-w-[200px] object-contain sm:h-12 ${overlayHeader ? "brightness-0 invert" : ""}`} />
  ) : (
    <span className="site-heading text-lg font-bold">{agent.name}</span>
  );

  return (
    <div style={themeVars(theme) as React.CSSProperties} className="site-root min-h-screen">
      {/* Fonts come from a fixed allowlist, so this URL is never user-controlled. */}
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${FONT_PAIRS[theme.fonts].google}&display=swap`} />
      <header className={overlayHeader ? "absolute inset-x-0 top-0 z-30 text-white" : "relative z-30"} style={overlayHeader ? undefined : { borderBottom: "1px solid var(--surface)" }}>
        <div className="site-container flex items-center justify-between gap-6 py-5">
          <a href={home || "#"} aria-label={`${agent.name ?? "Home"} home`}>{brand}</a>
          <nav aria-label="Main" className="hidden items-center gap-7 text-sm lg:flex" style={overlayHeader ? undefined : { color: "var(--muted)" }}>
            {links.map((l) => <a key={l.label} href={l.href} {...(l.external ? { target: "_blank", rel: "noopener" } : {})} className="hover:opacity-70">{l.label}</a>)}
            <a href={anchor("contact")} className="rounded-full px-4 py-2 font-semibold" style={overlayHeader ? { border: "1px solid rgba(255,255,255,.7)" } : { background: "var(--accent)", color: "var(--accent-text)" }}>Contact</a>
          </nav>
          <details className="relative lg:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center" aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M3 7h18M3 12h18M3 17h18" /></svg>
            </summary>
            <div className="absolute right-0 top-12 w-60 p-3 shadow-xl" style={{ background: "var(--bg)", color: "var(--text)", borderRadius: "var(--radius)" }}>
              {[...links, { href: anchor("contact"), label: "Contact" }].map((l) => (
                <a key={l.label} href={l.href} className="block rounded px-3 py-2.5 text-sm hover:opacity-70">{l.label}</a>
              ))}
            </div>
          </details>
        </div>
      </header>
      <main>{children}</main>
      <ComplianceFooter agent={agent} />
    </div>
  );
}

/** Rendered from the agent record, never from editable content: AI edits cannot touch it. */
function ComplianceFooter({ agent }: { agent: Agent }) {
  return (
    <footer className="mt-10 border-t py-10 text-xs" style={{ borderColor: "var(--surface)", color: "var(--muted)" }}>
      <div className="site-container space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{agent.name}</p>
          <div style={{ color: "var(--text)" }}><SocialLinks agent={agent} /></div>
        </div>
        <p>
          {agent.brokerage}
          {agent.licenseNumber && <> · {agent.licenseState} License #{agent.licenseNumber}</>}
        </p>
        <p>
          Equal Housing Opportunity. We are committed to compliance with all federal, state and local fair housing laws.
          Information deemed reliable but not guaranteed. Listing information is provided by the listing brokerage.
        </p>
      </div>
    </footer>
  );
}
