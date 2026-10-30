import { notFound } from "next/navigation";
import { SiteRenderer } from "@/components/site/SiteRenderer";
import { getOwnedSite } from "@/lib/auth";
import { getAssets, headshotOf } from "@/lib/sites";
import type { SiteContent } from "@/lib/blocks/schema";
import type { Theme } from "@/lib/blocks/theme";

/** Owner-only draft preview. ?rev=<id> previews a proposed AI edit before accepting. */
export default async function Preview({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ rev?: string }>;
}) {
  const { siteId } = await params;
  const { rev } = await searchParams;
  const { site, supabase } = await getOwnedSite(siteId);
  if (!site) notFound();

  let content = site.content as SiteContent | null;
  let theme = site.theme as Theme | null;
  if (rev) {
    const { data } = await supabase.from("site_revisions").select("content, theme").eq("id", rev).eq("site_id", siteId).maybeSingle();
    if (data) ({ content, theme } = data as { content: SiteContent; theme: Theme });
  }
  if (!content || !theme) return <p className="p-10 text-sm text-stone-500">Nothing generated yet.</p>;

  const assets = await getAssets(siteId);
  return <SiteRenderer content={content} theme={theme} agent={site.agent} siteId={siteId} interactive={false} headshot={headshotOf(assets)} />;
}
