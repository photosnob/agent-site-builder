import type { SiteContent } from "../blocks/schema";
import type { AgentProfile } from "../types";
import type { SiteSeo } from "./schema";

/** Data the SEO files are generated from. */
export interface SeoSite {
  slug: string;
  /** Published inner pages (Buy, Sell, Team…). */
  pages?: { slug: string; title: string; updated_at?: string }[];
  origin: string; // public origin + base path, no trailing slash
  agent: Partial<AgentProfile>;
  content: SiteContent | null;
  seo: SiteSeo;
  publishedAt: string | null;
}
export interface SeoPost { slug: string; title: string; excerpt: string | null; meta_description: string | null; published_at: string | null; updated_at: string }

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const iso = (d: string | null | undefined) => (d ? new Date(d).toISOString() : undefined);

export function defaultTitle(agent: Partial<AgentProfile>) {
  return [agent.name, agent.brokerage].filter(Boolean).join(" | ");
}
export function defaultDescription(agent: Partial<AgentProfile>, content: SiteContent | null) {
  const hero = content?.blocks.find((b) => b.type === "hero");
  if (hero?.type === "hero" && hero.props.subheadline) return hero.props.subheadline;
  return `Real estate in ${(agent.serviceAreas ?? []).join(", ")} with ${agent.name}${agent.brokerage ? `, ${agent.brokerage}` : ""}.`;
}

export function sitemapXml(site: SeoSite, posts: SeoPost[]) {
  if (site.seo.noindex) return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`;
  const latestPost = posts.reduce<string | null>((m, p) => (!m || p.updated_at > m ? p.updated_at : m), null);
  const urls = [
    { loc: site.origin || "/", lastmod: iso(site.publishedAt), priority: "1.0" },
    ...(site.pages ?? []).map((p) => ({ loc: `${site.origin}/${p.slug}`, lastmod: iso(p.updated_at ?? site.publishedAt), priority: "0.8" })),
    ...(posts.length ? [{ loc: `${site.origin}/blog`, lastmod: iso(latestPost), priority: "0.7" }] : []),
    ...posts.map((p) => ({ loc: `${site.origin}/blog/${p.slug}`, lastmod: iso(p.updated_at), priority: "0.6" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`;
}

export function robotsTxt(site: SeoSite) {
  if (site.seo.noindex) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`;
}

/** llmsTxt per llmstxt.org: a Markdown summary that helps AI assistants describe the agent accurately. */
export function llmsTxt(site: SeoSite, posts: SeoPost[]) {
  if (site.seo.llmsTxt?.trim()) return site.seo.llmsTxt.trim() + "\n";
  const a = site.agent;
  const about = site.content?.blocks.find((b) => b.type === "about");
  const lines = [
    `# ${a.name ?? site.slug}`,
    "",
    `> ${site.seo.description || defaultDescription(a, site.content)}`,
    "",
    [
      a.brokerage && `- Brokerage: ${a.brokerage}`,
      a.licenseNumber && `- License: ${a.licenseState ?? ""} #${a.licenseNumber}`.replace(":  #", ": #"),
      a.serviceAreas?.length && `- Areas served: ${a.serviceAreas.join(", ")}`,
      a.specialties?.length && `- Specialties: ${a.specialties.join(", ")}`,
      a.yearsExperience != null && `- Years in real estate: ${a.yearsExperience}`,
      a.phone && `- Phone: ${a.phone}`,
      a.email && `- Email: ${a.email}`,
    ].filter(Boolean).join("\n"),
  ];
  if (about?.type === "about") lines.push("", "## About", "", about.props.body.slice(0, 1500));
  lines.push("", "## Pages", "", `- [Home](${site.origin || "/"}): listings, about, and contact`);
  for (const p of site.pages ?? []) lines.push(`- [${p.title}](${site.origin}/${p.slug})`);
  if (posts.length) {
    lines.push(`- [Blog](${site.origin}/blog): market updates and guides`, "", "## Blog posts", "");
    for (const p of posts.slice(0, 50)) {
      const desc = p.meta_description || p.excerpt;
      lines.push(`- [${p.title.replace(/[[\]]/g, "")}](${site.origin}/blog/${p.slug})${desc ? `: ${desc}` : ""}`);
    }
  }
  return lines.join("\n") + "\n";
}

export function rssXml(site: SeoSite, posts: SeoPost[]) {
  const title = `${site.agent.name ?? site.slug} Blog`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xml(title)}</title>
  <link>${xml(`${site.origin}/blog`)}</link>
  <description>${xml(`Market updates and guides from ${site.agent.name ?? "this agent"}`)}</description>
  <atom:link href="${xml(`${site.origin}/blog/rss.xml`)}" rel="self" type="application/rss+xml" />
${posts.slice(0, 50).map((p) => `  <item>
    <title>${xml(p.title)}</title>
    <link>${xml(`${site.origin}/blog/${p.slug}`)}</link>
    <guid isPermaLink="true">${xml(`${site.origin}/blog/${p.slug}`)}</guid>
    ${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}
    ${p.meta_description || p.excerpt ? `<description>${xml((p.meta_description || p.excerpt)!)}</description>` : ""}
  </item>`).join("\n")}
</channel>
</rss>
`;
}

/** schema.org RealEstateAgent for the home page. */
export function agentJsonLd(site: SeoSite, image?: string) {
  const a = site.agent;
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: a.name,
    url: site.origin || undefined,
    image: image || undefined,
    telephone: a.phone || undefined,
    email: a.email || undefined,
    description: site.seo.description || defaultDescription(a, site.content),
    areaServed: a.serviceAreas?.map((name) => ({ "@type": "Place", name })),
    worksFor: a.brokerage ? { "@type": "RealEstateOrganization", name: a.brokerage } : undefined,
    knowsAbout: a.specialties?.length ? a.specialties : undefined,
  };
}
