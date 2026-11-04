import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { PostBody } from "@/components/blog/PostBody";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { buildToc, plainText, readingMinutes } from "@/lib/blog/content";
import { getPublishedPost, getPublishedPosts } from "@/lib/blog/server";
import { getPublishedSiteBySlug } from "@/lib/sites";
import { basePath, canonicalOrigin } from "@/lib/siteUrls";
import { seoOf } from "./HomePage";
import { getAssets, headshotOf } from "@/lib/sites";
import { getSiteData } from "@/lib/siteData";
import { JsonLd } from "@/components/seo/JsonLd";
import { AuthorBox } from "@/components/blog/AuthorBox";
import { blogIndexGraph, blogPostGraph, type LdSite } from "@/lib/seo/jsonld";

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "";

async function loadSite(slug: string) {
  const site = await getPublishedSiteBySlug(slug);
  if (!site?.published_theme) notFound();
  return site as typeof site & { published_theme: NonNullable<typeof site.published_theme> };
}

async function ldSite(site: Awaited<ReturnType<typeof loadSite>>, slug: string): Promise<LdSite & { aboutBody?: string; nav: Awaited<ReturnType<typeof getSiteData>>["nav"] }> {
  const [assets, data] = await Promise.all([getAssets(site.id), getSiteData(site.id)]);
  const about = site.published_content?.blocks.find((b) => b.type === "about");
  return {
    origin: canonicalOrigin(slug),
    agent: site.agent,
    content: site.published_content,
    seo: seoOf(site.seo),
    headshot: headshotOf(assets),
    logo: assets.find((a) => a.kind === "logo")?.url,
    aboutBody: about?.type === "about" ? about.props.body : undefined,
    nav: data.nav,
  };
}

const hasSection = (site: Awaited<ReturnType<typeof loadSite>>, type: string) =>
  Boolean(site.published_content?.blocks.some((b) => b.type === type));

/* ---------------- Index ---------------- */

export async function blogIndexMetadata(slug: string, hosted: boolean): Promise<Metadata> {
  const site = await getPublishedSiteBySlug(slug);
  if (!site) return {};
  const origin = canonicalOrigin(slug, hosted);
  return {
    title: { absolute: `Blog | ${site.agent.name}` },
    description: `Market updates, neighborhood guides and advice from ${site.agent.name}.`,
    alternates: { canonical: `${origin}/blog`, types: { "application/rss+xml": `${origin}/blog/rss.xml` } },
    robots: seoOf(site.seo).noindex ? { index: false, follow: false } : undefined,
  };
}

export async function BlogIndexPage({ slug, hosted }: { slug: string; hosted: boolean }) {
  const site = await loadSite(slug);
  const [posts, ld] = await Promise.all([getPublishedPosts(site.id), ldSite(site, slug)]);
  const base = basePath(slug, hosted);
  return (
    <SiteShell theme={site.published_theme} agent={site.agent} base={base} hasBlog nav={ld.nav} logo={ld.logo}
      sections={{ listings: hasSection(site, "featured-listings"), about: hasSection(site, "about") }}>
      <JsonLd data={blogIndexGraph(ld, posts)} />
      <div className="site-container py-12 md:py-16">
        <h1 className="site-heading text-4xl sm:text-5xl">Blog</h1>
        {posts.length === 0 && <p className="mt-6" style={{ color: "var(--muted)" }}>No posts yet.</p>}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <a key={p.id} href={`${base}/blog/${p.slug}`} className="group block">
              {p.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover transition group-hover:opacity-90" style={{ borderRadius: "var(--radius)" }} />
              ) : (
                <div className="aspect-[3/2] w-full" style={{ background: "var(--surface)", borderRadius: "var(--radius)" }} />
              )}
              <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{fmtDate(p.published_at)}</p>
              <h2 className="site-heading mt-1 text-xl leading-snug group-hover:underline">{p.title}</h2>
              {p.excerpt && <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{p.excerpt}</p>}
            </a>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

/* ---------------- Post ---------------- */

export async function blogPostMetadata(slug: string, postSlug: string, hosted: boolean): Promise<Metadata> {
  const site = await getPublishedSiteBySlug(slug);
  if (!site) return {};
  const post = await getPublishedPost(site.id, postSlug);
  if (!post) return {};
  const description = post.meta_description || post.excerpt || plainText(post.content).slice(0, 155);
  const origin = canonicalOrigin(slug, hosted);
  const url = `${origin}/blog/${post.slug}`;
  // A custom SEO title is used exactly as written; otherwise "<post title> | <agent>".
  const title = post.seo_title || `${post.title} | ${site.agent.name}`;
  const images = post.cover_image ? [post.cover_image] : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, types: { "application/rss+xml": `${origin}/blog/rss.xml` } },
    openGraph: { type: "article", title: post.seo_title || post.title, description, url, images, publishedTime: post.published_at ?? undefined, modifiedTime: post.updated_at, authors: site.agent.name ? [site.agent.name] : undefined },
    twitter: { card: images ? "summary_large_image" : "summary", title: post.seo_title || post.title, description, images },
    robots: seoOf(site.seo).noindex ? { index: false, follow: false } : undefined,
  };
}

export async function BlogPostPage({ slug, postSlug, hosted }: { slug: string; postSlug: string; hosted: boolean }) {
  const site = await loadSite(slug);
  const post = await getPublishedPost(site.id, postSlug);
  if (!post) notFound();
  const base = basePath(slug, hosted);
  const toc = post.show_toc ? buildToc(post.content) : [];
  const showToc = toc.length >= 2;

  const ld = await ldSite(site, slug);
  const graphData = blogPostGraph(ld, {
    slug: post.slug,
    title: post.title,
    seoTitle: post.seo_title,
    description: post.meta_description || post.excerpt || undefined,
    image: post.cover_image,
    published_at: post.published_at,
    updated_at: post.updated_at,
    wordCount: plainText(post.content).split(/\s+/).filter(Boolean).length,
    sections: toc.filter((t) => t.level === 2).map((t) => t.text),
  });

  return (
    <SiteShell theme={site.published_theme} agent={site.agent} base={base} hasBlog nav={ld.nav} logo={ld.logo}
      sections={{ listings: hasSection(site, "featured-listings"), about: hasSection(site, "about") }}>
      <JsonLd data={graphData} />
      <article className="site-container py-10 md:py-14">
        <div className={showToc ? "grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]" : ""}>
          <div className="mx-auto w-full max-w-[720px]">
            <a href={`${base}/blog`} className="text-sm" style={{ color: "var(--muted)" }}>← All posts</a>
            <h1 className="site-heading mt-4 text-4xl leading-tight sm:text-5xl">{post.title}</h1>
            <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
              {site.agent.name} · {fmtDate(post.published_at)} · {readingMinutes(post.content)} min read
            </p>
            {post.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.cover_image} alt="" className="mt-8 aspect-[2/1] w-full object-cover" style={{ borderRadius: "var(--radius)" }} />
            )}
            {showToc && <TableOfContents toc={toc} variant="inline" />}
            <div className="mt-8">
              <PostBody doc={post.content} />
            </div>
            <AuthorBox agent={site.agent} headshot={ld.headshot} fallbackBio={ld.aboutBody || site.agent.bio} aboutHref={`${base || "/"}#about`} />
            <div className="mt-10 p-8 text-center" style={{ background: "var(--surface)", borderRadius: "var(--radius)" }}>
              <p className="site-heading text-2xl">Questions about buying or selling?</p>
              <a href={`${base || "/"}#contact`} className="site-btn mt-5 inline-block">Get in touch</a>
            </div>
          </div>
          {showToc && (
            <aside>
              <TableOfContents toc={toc} variant="sidebar" />
            </aside>
          )}
        </div>
      </article>
    </SiteShell>
  );
}
