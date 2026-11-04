import type { AgentProfile } from "../types";
import type { SiteSeo } from "./schema";
import { defaultDescription, defaultTitle } from "./files";
import type { SiteContent } from "../blocks/schema";

/**
 * schema.org graph for every public page. Each page emits one @graph whose
 * nodes reference shared entities by @id (the agent, the person, the website),
 * which is how Google links pages to the same business and author.
 */
export interface LdSite {
  origin: string;
  agent: Partial<AgentProfile>;
  content: SiteContent | null;
  seo: SiteSeo;
  headshot?: string;
  logo?: string;
}

const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))) as T;

export const ids = (origin: string) => ({
  agent: `${origin}/#agent`,
  person: `${origin}/#person`,
  website: `${origin}/#website`,
  blog: `${origin}/blog#blog`,
});

const sameAs = (a: Partial<AgentProfile>) => Object.values(a.socials ?? {}).filter(Boolean) as string[];

/** The business: the agent's real estate practice. */
export function agentNode(s: LdSite) {
  const a = s.agent;
  return clean({
    "@type": "RealEstateAgent",
    "@id": ids(s.origin).agent,
    name: a.name,
    url: s.origin || undefined,
    image: s.headshot,
    logo: s.logo,
    telephone: a.phone || undefined,
    email: a.email || undefined,
    description: s.seo.description || defaultDescription(a, s.content),
    areaServed: a.serviceAreas?.map((name) => ({ "@type": "Place", name })),
    knowsAbout: a.specialties,
    parentOrganization: a.brokerage ? { "@type": "RealEstateOrganization", name: a.brokerage } : undefined,
    founder: { "@id": ids(s.origin).person },
    sameAs: sameAs(a),
  });
}

/** The person: used as the author of blog posts. */
export function personNode(s: LdSite) {
  const a = s.agent;
  return clean({
    "@type": "Person",
    "@id": ids(s.origin).person,
    name: a.name,
    url: s.origin || undefined,
    image: s.headshot,
    jobTitle: "Real Estate Agent",
    description: a.shortBio || undefined,
    worksFor: a.brokerage ? { "@type": "RealEstateOrganization", name: a.brokerage } : undefined,
    sameAs: sameAs(a),
  });
}

export function websiteNode(s: LdSite) {
  return clean({
    "@type": "WebSite",
    "@id": ids(s.origin).website,
    url: s.origin || undefined,
    name: s.seo.title || defaultTitle(s.agent),
    publisher: { "@id": ids(s.origin).agent },
    inLanguage: "en-US",
  });
}

export function webPageNode(url: string, name: string, s: LdSite, extra: Record<string, unknown> = {}) {
  return clean({
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    isPartOf: { "@id": ids(s.origin).website },
    about: { "@id": ids(s.origin).agent },
    inLanguage: "en-US",
    ...extra,
  });
}

export function breadcrumbNode(url: string, items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export const graph = (...nodes: Record<string, unknown>[]) => ({ "@context": "https://schema.org", "@graph": nodes });

/* ---------- Page-level graphs ---------- */

export function homeGraph(s: LdSite) {
  const url = s.origin || "/";
  return graph(
    agentNode(s),
    personNode(s),
    websiteNode(s),
    webPageNode(url, s.seo.title || defaultTitle(s.agent), s, { "@type": ["WebPage", "AboutPage"], description: s.seo.description || defaultDescription(s.agent, s.content), primaryImageOfPage: s.headshot }),
  );
}

export function blogIndexGraph(s: LdSite, posts: { slug: string; title: string; published_at: string | null }[]) {
  const url = `${s.origin}/blog`;
  return graph(
    websiteNode(s),
    agentNode(s),
    clean({
      "@type": "Blog",
      "@id": ids(s.origin).blog,
      url,
      name: `${s.agent.name ?? ""} Blog`.trim(),
      publisher: { "@id": ids(s.origin).agent },
      author: { "@id": ids(s.origin).person },
      blogPost: posts.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${url}/${p.slug}`, datePublished: p.published_at ?? undefined })),
    }),
    webPageNode(url, "Blog", s, { "@type": ["WebPage", "CollectionPage"], mainEntity: { "@id": ids(s.origin).blog }, breadcrumb: { "@id": `${url}#breadcrumb` } }),
    breadcrumbNode(url, [{ name: "Home", url: s.origin || "/" }, { name: "Blog", url }]),
  );
}

export function blogPostGraph(
  s: LdSite,
  post: { slug: string; title: string; seoTitle?: string | null; description?: string; image?: string | null; published_at: string | null; updated_at: string; wordCount: number; sections: string[] },
) {
  const url = `${s.origin}/blog/${post.slug}`;
  return graph(
    websiteNode(s),
    agentNode(s),
    personNode(s),
    webPageNode(url, post.seoTitle || post.title, s, { breadcrumb: { "@id": `${url}#breadcrumb` }, primaryImageOfPage: post.image ?? undefined }),
    breadcrumbNode(url, [{ name: "Home", url: s.origin || "/" }, { name: "Blog", url: `${s.origin}/blog` }, { name: post.title, url }]),
    clean({
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: post.title.slice(0, 110),
      description: post.description,
      image: post.image ?? undefined,
      datePublished: post.published_at ?? undefined,
      dateModified: post.updated_at,
      author: { "@id": ids(s.origin).person },
      publisher: { "@id": ids(s.origin).agent },
      mainEntityOfPage: { "@id": `${url}#webpage` },
      isPartOf: { "@id": ids(s.origin).blog },
      wordCount: post.wordCount,
      articleSection: post.sections.length ? post.sections.slice(0, 10) : undefined,
      inLanguage: "en-US",
    }),
  );
}
