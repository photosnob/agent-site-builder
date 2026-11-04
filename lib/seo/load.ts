import { notFound } from "next/navigation";
import { getPublishedPosts } from "../blog/server";
import { getPublishedSiteBySlug } from "../sites";
import { canonicalOrigin } from "../siteUrls";
import { createAdminClient } from "../supabase/server";
import { SiteSeo } from "./schema";
import type { SeoSite } from "./files";

export async function loadSeoSite(slug: string) {
  const site = await getPublishedSiteBySlug(slug);
  if (!site) notFound();
  const parsed = SiteSeo.safeParse(site.seo ?? {});
  const seoSite: SeoSite = {
    slug,
    origin: canonicalOrigin(slug),
    agent: site.agent,
    content: site.published_content,
    seo: parsed.success ? parsed.data : {},
    publishedAt: site.published_at,
  };
  const [posts, pages] = await Promise.all([getPublishedPosts(site.id, 1000), publishedPages(site.id)]);
  seoSite.pages = pages;
  return { site, seoSite, posts };
}

async function publishedPages(siteId: string) {
  try {
    const { data } = await createAdminClient().from("site_pages").select("slug, title, updated_at, published_content").eq("site_id", siteId).eq("enabled", true).order("position");
    return (data ?? []).filter((p) => p.published_content).map(({ slug, title, updated_at }) => ({ slug, title, updated_at }));
  } catch {
    return [];
  }
}

export const textResponse = (body: string, type: string) =>
  new Response(body, {
    headers: {
      "content-type": `${type}; charset=utf-8`,
      "x-content-type-options": "nosniff",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
