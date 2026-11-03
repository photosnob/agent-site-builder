import { FONT_PAIRS, themeVars, type Theme } from "@/lib/blocks/theme";
import type { AgentProfile } from "@/lib/types";

type Agent = Partial<AgentProfile>;

/**
 * Header, theme and compliance footer shared by the home page and blog pages.
 * `base` is the public path prefix; undefined means "same page" (dashboard preview).
 */
export function SiteShell({
  theme, agent, base, hasBlog, sections = { listings: true, about: true }, children,
}: {
  theme: Theme; agent: Agent; base?: string; hasBlog?: boolean;
  sections?: { listings: boolean; about: boolean }; children: React.ReactNode;
}) {
  const home = base === undefined ? "" : base || "/";
  const anchor = (id: string) => `${home}#${id}`;
  return (
    <div style={themeVars(theme) as React.CSSProperties} className="site-root min-h-screen">
      {/* Fonts come from a fixed allowlist, so this URL is never user-controlled. */}
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${FONT_PAIRS[theme.fonts].google}&display=swap`} />
      <header className="site-container flex items-center justify-between py-5">
        <a href={home || "#"} className="site-heading text-lg font-bold">{agent.name}</a>
        <nav className="flex gap-5 text-sm sm:gap-6" style={{ color: "var(--muted)" }}>
          {sections.listings && <a className="hidden sm:inline" href={anchor("listings")}>Listings</a>}
          {sections.about && <a className="hidden sm:inline" href={anchor("about")}>About</a>}
          {hasBlog && base !== undefined && <a href={`${base}/blog`}>Blog</a>}
          <a href={anchor("contact")}>Contact</a>
        </nav>
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
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{agent.name}</p>
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
