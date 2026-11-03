import { revalidatePath } from "next/cache";

/**
 * Agent sites are served two ways, with identical pages:
 *   /s/<slug>/...           on the app's own domain (path mode)
 *   <slug>.<root>/...       rewritten by proxy.ts to /h/<slug>/... (hosted mode)
 * Hosted pages link from "/", path-mode pages from "/s/<slug>". Keeping the mode
 * in the route (not in request headers) lets both stay statically cached.
 */
export const basePath = (slug: string, hosted: boolean) => (hosted ? "" : `/s/${slug}`);

export function canonicalOrigin(slug: string, hosted: boolean) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (hosted && root) return `${root.startsWith("lvh.me") || root.startsWith("localhost") ? "http" : "https"}://${slug}.${root}`;
  return `${process.env.NEXT_PUBLIC_APP_URL || ""}/s/${slug}`;
}

/** Refresh cached public pages for a site in both modes. */
export function revalidateSite(slug: string, ...subpaths: string[]) {
  for (const sub of subpaths.length ? subpaths : [""]) {
    revalidatePath(`/s/${slug}${sub}`);
    revalidatePath(`/h/${slug}${sub}`);
  }
}

/** Where the agent's published site lives, for links from the dashboard. */
export function publicSiteUrl(slug: string) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  return root ? canonicalOrigin(slug, true) : `/s/${slug}`;
}
