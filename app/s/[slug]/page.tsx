import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteRenderer } from "@/components/site/SiteRenderer";
import { getAssets, getPublishedSiteBySlug, headshotOf } from "@/lib/sites";

// Cached per slug; publishing calls revalidatePath(`/s/${slug}`).
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await getPublishedSiteBySlug((await params).slug);
  if (!site?.published_content) return {};
  const hero = site.published_content.blocks.find((b) => b.type === "hero");
  const areas = site.agent.serviceAreas?.join(", ");
  return {
    title: `${site.agent.name} | ${site.agent.brokerage}`,
    description: hero?.type === "hero" ? hero.props.subheadline : `Real estate in ${areas}`,
  };
}

export default async function PublicSite({ params }: Props) {
  const site = await getPublishedSiteBySlug((await params).slug);
  if (!site?.published_content || !site.published_theme) notFound();
  const assets = await getAssets(site.id);
  return (
    <SiteRenderer
      content={site.published_content}
      theme={site.published_theme}
      agent={site.agent}
      siteId={site.id}
      headshot={headshotOf(assets)}
    />
  );
}
