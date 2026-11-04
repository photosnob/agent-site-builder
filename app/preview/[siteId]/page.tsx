import { notFound } from "next/navigation";
import { SiteRenderer } from "@/components/site/SiteRenderer";
import { getOwnedSite } from "@/lib/auth";
import { getAssets, headshotOf } from "@/lib/sites";
import { getSiteData } from "@/lib/siteData";
import { publicSiteUrl } from "@/lib/siteUrls";
import type { AnyContent } from "@/lib/blocks/schema";
import type { Theme } from "@/lib/blocks/theme";

/** Owner-only draft preview. ?page=<slug> previews an inner page; ?rev=<id> previews a proposed AI edit. */
export default async function Preview({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ rev?: string; page?: string }>;
}) {
  const { siteId } = await params;
  const { rev, page } = await searchParams;
  const { site, supabase } = await getOwnedSite(siteId);
  if (!site) notFound();

  let content = site.content as AnyContent | null;
  let theme = site.theme as Theme | null;
  if (page) {
    const { data } = await supabase.from("site_pages").select("content").eq("site_id", siteId).eq("slug", page).maybeSingle();
    if (!data) notFound();
    content = data.content as AnyContent;
  }
  if (rev) {
    const { data } = await supabase.from("site_revisions").select("content, theme").eq("id", rev).eq("site_id", siteId).maybeSingle();
    if (data) ({ content, theme } = data as { content: AnyContent; theme: Theme });
  }
  if (!content || !theme) return <p className="p-10 text-sm text-stone-500">Nothing generated yet.</p>;

  const [assets, data] = await Promise.all([getAssets(siteId), getSiteData(siteId, { publishedPagesOnly: false })]);
  return (
    <SiteRenderer content={content} theme={theme} agent={site.agent} siteId={siteId} interactive={false} headshot={headshotOf(assets)}
      logo={assets.find((a) => a.kind === "logo")?.url} data={data}
      hasBlog={data.posts.length > 0} blogHref={`${publicSiteUrl(site.slug)}/blog`} />
  );
}
