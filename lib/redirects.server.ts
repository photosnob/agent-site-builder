import { notFound, permanentRedirect, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "./supabase/server";
import { fetchWithFallback } from "./import/safeFetch";
import { basePath } from "./siteUrls";
import { getPublishedPosts } from "./blog/server";
import { listPages } from "./pages/server";
import { destinations, isSkippablePath, normalizePath, parseSitemap, suggestTarget } from "./redirects";

/**
 * Called where the public site would otherwise 404. Normal pages never touch
 * the redirects table, so redirects cost nothing for regular traffic.
 */
export async function redirectOrNotFound(slug: string, rawPath: string, hosted: boolean): Promise<never> {
  const from = normalizePath(rawPath);
  if (from) {
    const admin = createAdminClient();
    const { data: site } = await admin.from("sites").select("id").eq("slug", slug).maybeSingle();
    if (site) {
      const { data: r } = await admin.from("site_redirects").select("to_path, permanent").eq("site_id", site.id).eq("from_path", from).maybeSingle();
      if (r && normalizePath(r.to_path.split("#")[0]) !== from) {
        const target = /^https?:\/\//i.test(r.to_path) ? r.to_path : `${basePath(slug, hosted)}${r.to_path}` || "/";
        if (r.permanent) permanentRedirect(target);
        redirect(target);
      }
    }
  }
  notFound();
}

/** Clears cached 404s/redirects for these old paths on both URL styles. */
export function refreshRedirectPaths(slug: string, paths: string[]) {
  for (const p of paths.slice(0, 200)) {
    revalidatePath(`/h/${slug}${p}`);
    revalidatePath(`/s/${slug}${p}`);
  }
}

export async function siteDestinations(siteId: string) {
  const [pages, posts] = await Promise.all([listPages(siteId), getPublishedPosts(siteId, 1000)]);
  return { dests: destinations(pages, posts), livePaths: new Set(["/blog", ...pages.filter((p) => p.enabled).map((p) => `/${p.slug}`), ...posts.map((p) => `/blog/${p.slug}`)]) };
}

const sameSite = (a: string, b: string) => a.replace(/^www\./, "") === b.replace(/^www\./, "");

/** Same host, and inside the folder that was entered (an agent page on a brokerage site shouldn't pull in the whole brokerage). */
function within(url: string, root: URL) {
  try {
    const u = new URL(url);
    const prefix = root.pathname.replace(/\/+$/, "").toLowerCase();
    return sameSite(u.hostname, root.hostname) && (!prefix || u.pathname.toLowerCase() === prefix || u.pathname.toLowerCase().startsWith(`${prefix}/`));
  } catch { return false; }
}

/**
 * Lists the old site's page URLs: its sitemap(s) first (most sites have one),
 * then links on the home page as a fallback.
 */
export async function discoverOldUrls(siteUrl: string): Promise<{ urls: string[]; via: "sitemap" | "links" }> {
  const root = new URL(siteUrl);
  const deadline = Date.now() + 40_000;
  const found = new Set<string>();
  const seen = new Set<string>();
  const queue = [`${root.origin}/sitemap.xml`, `${root.origin}/sitemap_index.xml`, `${root.origin}/wp-sitemap.xml`];

  try {
    const robots = (await fetchWithFallback(`${root.origin}/robots.txt`, { maxBytes: 200_000, timeoutMs: 8000 }, undefined, deadline)).body.toString("utf8");
    for (const m of robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)) queue.unshift(m[1]);
  } catch { /* no robots.txt */ }

  while (queue.length && seen.size < 20 && found.size < 1000 && Date.now() < deadline - 5000) {
    const sm = queue.shift()!;
    if (seen.has(sm)) continue;
    seen.add(sm);
    try {
      const u = new URL(sm);
      if (!sameSite(u.hostname, root.hostname)) continue;
      const res = await fetchWithFallback(sm, { maxBytes: 5_000_000, timeoutMs: 10000, accept: "application/xml,text/xml,*/*" }, undefined, deadline);
      const xml = res.body.toString("utf8");
      if (!/<(urlset|sitemapindex)[\s>]/i.test(xml)) continue;
      const { pages, sitemaps } = parseSitemap(xml);
      // Skip image/video/listing-feed sitemaps that would only add noise.
      queue.push(...sitemaps.filter((s) => !/image|video|attachment/i.test(s)));
      for (const p of pages) if (within(p, root)) found.add(p);
    } catch { /* missing sitemap */ }
  }
  if (found.size) return { urls: [...found], via: "sitemap" };

  const home = (await fetchWithFallback(root.toString(), { timeoutMs: 12000 }, undefined, deadline)).body.toString("utf8");
  for (const m of home.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["']/gi)) {
    try { const u = new URL(m[1], root); if (within(u.toString(), root)) found.add(u.toString()); } catch { /* skip */ }
  }
  return { urls: [...found].slice(0, 300), via: "links" };
}

/** Turns discovered URLs into suggested redirects (skipping ones already set). */
export async function suggestRedirects(siteId: string, urls: string[]) {
  const { dests, livePaths } = await siteDestinations(siteId);
  const { data: existing } = await createAdminClient().from("site_redirects").select("from_path").eq("site_id", siteId);
  const have = new Set((existing ?? []).map((r) => r.from_path as string));
  const out = new Map<string, { from_path: string; to_path: string; needs_review: boolean }>();
  for (const url of urls) {
    const from = normalizePath(url);
    if (!from || isSkippablePath(from) || have.has(from) || livePaths.has(from) || out.has(from)) continue;
    const s = suggestTarget(from, dests);
    out.set(from, { from_path: from, to_path: s.to, needs_review: !s.confident });
  }
  return [...out.values()];
}
