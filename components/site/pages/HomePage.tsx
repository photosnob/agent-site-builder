import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteRenderer } from "@/components/site/SiteRenderer";
import { getAssets, getPublishedSiteBySlug, headshotOf } from "@/lib/sites";
import { getPublishedPosts } from "@/lib/blog/server";
import { basePath, canonicalOrigin } from "@/lib/siteUrls";

export async function homeMetadata(slug: string, hosted: boolean): Promise<Metadata> {
  const site = await getPublishedSiteBySlug(slug);
  if (!site?.published_content) return {};
  const hero = site.published_content.blocks.find((b) => b.type === "hero");
  return {
    title: `${site.agent.name} | ${site.agent.brokerage}`,
    description: hero?.type === "hero" ? hero.props.subheadline : `Real estate in ${site.agent.serviceAreas?.join(", ")}`,
    alternates: { canonical: canonicalOrigin(slug, hosted) },
  };
}

export async function HomePage({ slug, hosted }: { slug: string; hosted: boolean }) {
  const site = await getPublishedSiteBySlug(slug);
  if (!site?.published_content || !site.published_theme) notFound();
  const [assets, posts] = await Promise.all([getAssets(site.id), getPublishedPosts(site.id, 1)]);
  return (
    <SiteRenderer
      content={site.published_content}
      theme={site.published_theme}
      agent={site.agent}
      siteId={site.id}
      headshot={headshotOf(assets)}
      base={basePath(slug, hosted)}
      hasBlog={posts.length > 0}
    />
  );
}
