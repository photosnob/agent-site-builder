import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteRenderer } from "@/components/site/SiteRenderer";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAssets, getPublishedSiteBySlug, headshotOf } from "@/lib/sites";
import { getPublishedPage, getSiteData } from "@/lib/siteData";
import { basePath, canonicalOrigin } from "@/lib/siteUrls";
import { agentNode, breadcrumbNode, graph, webPageNode, websiteNode } from "@/lib/seo/jsonld";
import { seoOf } from "./HomePage";

async function load(slug: string, pageSlug: string) {
  const site = await getPublishedSiteBySlug(slug);
  if (!site?.published_theme) return null;
  const page = await getPublishedPage(site.id, pageSlug);
  return page ? { site, page } : null;
}

export async function subPageMetadata(slug: string, pageSlug: string): Promise<Metadata> {
  const r = await load(slug, pageSlug);
  if (!r) return {};
  const { site, page } = r;
  const header = page.published_content!.blocks.find((b) => b.type === "page-header");
  const description = page.meta_description || (header?.type === "page-header" ? header.props.intro : undefined) || `${page.title} with ${site.agent.name}`;
  const title = page.seo_title || `${page.title} | ${site.agent.name}`;
  const url = `${canonicalOrigin(slug)}/${page.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, siteName: site.agent.name },
    robots: seoOf(site.seo).noindex ? { index: false, follow: false } : undefined,
  };
}

export async function SubPage({ slug, pageSlug, hosted }: { slug: string; pageSlug: string; hosted: boolean }) {
  const r = await load(slug, pageSlug);
  if (!r) notFound();
  const { site, page } = r;
  const [assets, data] = await Promise.all([getAssets(site.id), getSiteData(site.id)]);
  const origin = canonicalOrigin(slug);
  const url = `${origin}/${page.slug}`;
  const ld = { origin, agent: site.agent, content: site.published_content, seo: seoOf(site.seo), headshot: headshotOf(assets) };
  const pageType = page.kind === "team" ? ["WebPage", "AboutPage"] : page.kind === "reviews" ? ["WebPage", "CollectionPage"] : "WebPage";
  return (
    <>
      <JsonLd data={graph(
        websiteNode(ld),
        agentNode(ld),
        webPageNode(url, page.seo_title || page.title, ld, { "@type": pageType, breadcrumb: { "@id": `${url}#breadcrumb` } }),
        breadcrumbNode(url, [{ name: "Home", url: origin || "/" }, { name: page.title, url }]),
      )} />
      <SiteRenderer
        content={page.published_content!}
        theme={site.published_theme!}
        agent={site.agent}
        siteId={site.id}
        headshot={headshotOf(assets)}
        logo={assets.find((a) => a.kind === "logo")?.url}
        base={basePath(slug, hosted)}
        hasBlog={data.posts.length > 0}
        data={data}
      />
    </>
  );
}
