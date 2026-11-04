import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteRenderer } from "@/components/site/SiteRenderer";
import { getAssets, getPublishedSiteBySlug, headshotOf } from "@/lib/sites";
import { getPublishedPosts } from "@/lib/blog/server";
import { basePath, canonicalOrigin } from "@/lib/siteUrls";
import { defaultDescription, defaultTitle } from "@/lib/seo/files";
import { homeGraph } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteSeo } from "@/lib/seo/schema";

export const seoOf = (raw: unknown) => {
  const p = SiteSeo.safeParse(raw ?? {});
  return p.success ? p.data : {};
};

function heroImage(content: NonNullable<Awaited<ReturnType<typeof getPublishedSiteBySlug>>>["published_content"]) {
  const hero = content?.blocks.find((b) => b.type === "hero");
  const about = content?.blocks.find((b) => b.type === "about");
  return (hero?.type === "hero" && hero.props.image) || (about?.type === "about" && about.props.image) || undefined;
}

export async function homeMetadata(slug: string, _hosted: boolean): Promise<Metadata> {
  const site = await getPublishedSiteBySlug(slug);
  if (!site?.published_content) return {};
  const seo = seoOf(site.seo);
  const title = seo.title || defaultTitle(site.agent);
  const description = seo.description || defaultDescription(site.agent, site.published_content);
  const url = canonicalOrigin(slug);
  const image = seo.ogImage || heroImage(site.published_content);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, siteName: site.agent.name, images: image ? [image] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    verification: seo.googleVerification ? { google: seo.googleVerification } : undefined,
  };
}

export async function HomePage({ slug, hosted }: { slug: string; hosted: boolean }) {
  const site = await getPublishedSiteBySlug(slug);
  if (!site?.published_content || !site.published_theme) notFound();
  const [assets, posts] = await Promise.all([getAssets(site.id), getPublishedPosts(site.id, 1)]);
  const seo = seoOf(site.seo);
  const jsonLd = homeGraph({
    origin: canonicalOrigin(slug),
    agent: site.agent,
    content: site.published_content,
    seo,
    headshot: headshotOf(assets),
    logo: assets.find((x) => x.kind === "logo")?.url,
  });
  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteRenderer
        content={site.published_content}
        theme={site.published_theme}
        agent={site.agent}
        siteId={site.id}
        headshot={headshotOf(assets)}
        base={basePath(slug, hosted)}
        hasBlog={posts.length > 0}
      />
    </>
  );
}
