/**
 * Redirects from an agent's old site. Pure helpers (normalizing, matching old
 * URLs to new pages) live here so they can be unit tested; database and
 * fetching code is in redirects.server.ts.
 */

/** "https://old.com/About-Us/?ref=x#top" → "/about-us". Returns null for the home page or junk. */
export function normalizePath(input: string): string | null {
  let path = input.trim();
  if (!path) return null;
  try {
    path = /^[a-z][a-z0-9+.-]*:\/\//i.test(path) ? new URL(path).pathname : new URL(path.startsWith("/") ? path : `/${path}`, "https://x.invalid").pathname;
  } catch { return null; }
  try { path = decodeURIComponent(path); } catch { /* keep as is */ }
  path = path.toLowerCase().replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  if (!path || path === "/" || path.length > 500 || /[\s<>"]/.test(path)) return null;
  return path;
}

/** Where a redirect may point: a path on the new site (optionally with #anchor) or an http(s) URL. */
export function normalizeTarget(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) { try { return new URL(t).toString().slice(0, 800); } catch { return null; } }
  if (t.startsWith("#")) return `/${t}`;
  const withSlash = t.startsWith("/") ? t : `/${t}`;
  if (withSlash.startsWith("//") || /[\s<>"]/.test(withSlash)) return null;
  return withSlash.slice(0, 800);
}

export type Destination = { path: string; label: string; keywords?: string[] };

/** Every place on the new site a redirect can point to. */
export function destinations(pages: { slug: string; title: string; kind?: string; enabled?: boolean }[], posts: { slug: string; title: string }[]): Destination[] {
  const KW: Record<string, string[]> = {
    buy: ["buy", "buyer", "buyers", "buying", "purchase", "first-time"],
    sell: ["sell", "seller", "sellers", "selling", "list-your-home", "listing-guide"],
    team: ["team", "agents", "our-team", "staff", "meet", "meet-the-team", "about"],
    reviews: ["testimonials", "testimonial", "reviews", "review", "success", "stories", "clients", "client-stories"],
  };
  return [
    { path: "/", label: "Home" },
    { path: "/#about", label: "Home: About section", keywords: ["about", "about-me", "about-us", "bio", "biography"] },
    { path: "/#listings", label: "Home: Listings section", keywords: ["listings", "listing", "properties", "property", "homes-for-sale", "featured", "featured-listings", "search", "idx", "mls", "sold", "portfolio", "homes"] },
    { path: "/#contact", label: "Home: Contact form", keywords: ["contact", "contact-us", "contact-me", "get-in-touch", "connect"] },
    { path: "/#contact?intent=valuation", label: "Home: Home value request", keywords: ["home-value", "home-valuation", "valuation", "whats-my-home-worth", "home-worth", "cma", "market-analysis"] },
    { path: "/blog", label: "Blog", keywords: ["blog", "news", "articles", "posts", "category", "tag", "author", "resources", "insights"] },
    ...pages.filter((p) => p.enabled !== false).map((p) => ({ path: `/${p.slug}`, label: `Page: ${p.title}`, keywords: [p.slug, ...(KW[p.kind ?? ""] ?? [])] })),
    ...posts.map((p) => ({ path: `/blog/${p.slug}`, label: `Post: ${p.title}` })),
  ];
}

// Old-site paths that aren't pages: files, feeds, CMS internals.
const SKIP = /(\.(jpe?g|png|gif|webp|svg|ico|css|js|xml|json|txt|pdf|zip|mp4|mov|woff2?)$)|^\/(wp-(content|includes|json|admin|login)|feed|xmlrpc|cdn-cgi|_next|static|assets)(\/|$)|\/feed$/;
export const isSkippablePath = (p: string) => SKIP.test(p);

const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !/^\d+$/.test(t) && !STOP.has(t));
const STOP = new Set(["the", "and", "for", "with", "your", "you", "our", "to", "in", "of", "a", "an", "on", "how", "what", "why", "is", "are", "html", "htm", "php", "aspx", "index"]);

/**
 * Best guess at where an old URL should go. Blog posts match by slug (or by
 * shared words), sections and pages by keyword. Anything else goes home and
 * is flagged for the agent to review.
 */
export function suggestTarget(oldPath: string, dests: Destination[]): { to: string; confident: boolean } {
  const segs = oldPath.split("/").filter(Boolean).map((s) => s.replace(/\.(html?|php|aspx?)$/, ""));
  const last = segs[segs.length - 1] ?? "";

  // 1) Exact post slug anywhere in the path (/blog/x, /2021/05/x, /x).
  const post = dests.find((d) => d.path.startsWith("/blog/") && d.path.slice(6) === last);
  if (post) return { to: post.path, confident: true };

  // 2) The last segment is a known page/section name.
  const exact = dests.find((d) => d.keywords?.includes(last));
  if (exact) return { to: exact.path, confident: true };

  // 3) Post with mostly the same words in its slug.
  const want = new Set(tokens(last));
  if (want.size >= 2) {
    let best: { d: Destination; score: number } | null = null;
    for (const d of dests) {
      if (!d.path.startsWith("/blog/")) continue;
      const have = tokens(d.path.slice(6));
      const shared = have.filter((t) => want.has(t)).length;
      const score = shared / Math.max(want.size, have.length);
      if (score > (best?.score ?? 0)) best = { d, score };
    }
    if (best && best.score >= 0.6) return { to: best.d.path, confident: true };
  }

  // 3b) Keywords in shorter slugs ("sellers-guide", "about-jane"), last segment first.
  for (const seg of [...segs].reverse()) {
    const words = tokens(seg);
    const hit = dests.find((d) => d.keywords?.some((k) => words.length <= 3 && words.includes(k)));
    if (hit && !(hit.path === "/blog" && segs.length > 1 && seg !== last)) return { to: hit.path, confident: true };
  }

  // 4) Old blog-ish URL with no matching post → the blog index.
  if (/^(blog|news|posts?|articles?|category|tag|author)$/.test(segs[0] ?? "") || /^\d{4}$/.test(segs[0] ?? "")) return { to: "/blog", confident: false };
  return { to: "/", confident: false };
}

/** Pulls <loc> URLs out of a sitemap or sitemap index. */
export function parseSitemap(xml: string): { pages: string[]; sitemaps: string[] } {
  const locs = [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  return isIndex ? { pages: [], sitemaps: locs } : { pages: locs, sitemaps: [] };
}

/** "old → new" lines (also "old,new" or tab separated) for bulk import. */
export function parseBulk(text: string): { from: string; to: string }[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(/\s*(?:→|->|=>|,|\t)\s*|\s+/).filter(Boolean))
    .filter((p) => p.length >= 2)
    .map(([from, to]) => ({ from, to }));
}
