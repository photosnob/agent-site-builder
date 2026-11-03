import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/siteUrls";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 3600;

/**
 * The app domain's sitemap. Until agent sites have their own (sub)domains
 * (NEXT_PUBLIC_ROOT_DOMAIN unset), they live at /s/<slug> and are listed here.
 * Once a root domain is set, each site serves its own /sitemap.xml instead.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const app = appUrl();
  const entries: MetadataRoute.Sitemap = [{ url: `${app}/`, priority: 1 }];
  if (process.env.NEXT_PUBLIC_ROOT_DOMAIN || !process.env.NEXT_PUBLIC_SUPABASE_URL) return entries;
  try {
    const admin = createAdminClient();
    const { data: sites } = await admin.from("sites").select("id, slug, published_at, seo").eq("status", "live").limit(5000);
    const visible = (sites ?? []).filter((s) => !(s.seo as { noindex?: boolean } | null)?.noindex);
    const { data: posts } = visible.length
      ? await admin.from("blog_posts").select("site_id, slug, updated_at").eq("status", "published").in("site_id", visible.map((s) => s.id)).limit(20000)
      : { data: [] };
    const slugOf = new Map(visible.map((s) => [s.id, s.slug]));
    for (const s of visible) entries.push({ url: `${app}/s/${s.slug}`, lastModified: s.published_at ?? undefined, priority: 0.9 });
    for (const p of posts ?? []) entries.push({ url: `${app}/s/${slugOf.get(p.site_id)}/blog/${p.slug}`, lastModified: p.updated_at, priority: 0.6 });
  } catch (e) {
    console.error("sitemap", e);
  }
  return entries;
}
