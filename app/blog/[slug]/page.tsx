import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BRAND } from "@/components/marketing/Brand";
import { MarketingFooter, MarketingFrame, MarketingHeader } from "@/components/marketing/Chrome";
import { PostBody } from "@/components/blog/PostBody";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildToc, plainText, readingMinutes } from "@/lib/blog/content";
import { getPublishedPlatformPost } from "@/lib/blog/platform";
import { appUrl } from "@/lib/siteUrls";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

const label = "text-[12px] font-medium uppercase tracking-[0.18em]";
const serif = { fontFamily: BRAND.serif, fontWeight: 500, letterSpacing: "-0.01em" } as const;
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPlatformPost((await params).slug);
  if (!post) return {};
  const description = post.meta_description || post.excerpt || plainText(post.content).slice(0, 155);
  const url = `${appUrl()}/blog/${post.slug}`;
  const images = post.cover_image ? [post.cover_image] : undefined;
  return {
    title: { absolute: post.seo_title || `${post.title} | Launch & List` },
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", title: post.seo_title || post.title, description, url, images, siteName: "Launch & List", publishedTime: post.published_at ?? undefined, modifiedTime: post.updated_at },
    twitter: { card: images ? "summary_large_image" : "summary", title: post.seo_title || post.title, description, images },
  };
}

export default async function BlogPost({ params }: Props) {
  const post = await getPublishedPlatformPost((await params).slug);
  if (!post) notFound();
  const toc = post.show_toc ? buildToc(post.content) : [];
  const showToc = toc.length >= 2;
  const url = `${appUrl()}/blog/${post.slug}`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description || post.excerpt || undefined,
    image: post.cover_image || undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at,
    mainEntityOfPage: url,
    url,
    author: { "@type": "Organization", name: "Launch & List", url: appUrl() || undefined },
    publisher: { "@type": "Organization", name: "Launch & List", url: appUrl() || undefined },
  };

  return (
    <MarketingFrame>
      <div id="top" />
      <JsonLd data={ld} />
      <MarketingHeader />
      <article className="mx-auto max-w-[1280px] px-5 pb-24 pt-8 sm:px-8 lg:pt-12">
        <div className={showToc ? "grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]" : ""}>
          <div className="mx-auto w-full max-w-[720px]">
            <Link href="/blog" className={label} style={{ color: BRAND.taupe }}>← all posts</Link>
            <h1 className="mt-6 text-[2.75rem] leading-[1.02] sm:text-6xl" style={serif}>{post.title}</h1>
            <p className={`mt-5 ${label}`} style={{ color: BRAND.taupe }}>
              {fmtDate(post.published_at)} · {readingMinutes(post.content)} min read
            </p>
            {post.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.cover_image} alt="" className="mt-10 aspect-[2/1] w-full rounded object-cover" />
            )}
            {showToc && <TableOfContents toc={toc} variant="inline" />}
            <div className="ll-post mt-10" style={{ color: BRAND.ink }}>
              <style>{`.ll-post .post-body h2,.ll-post .post-body h3{font-family:${BRAND.serif};font-weight:500;color:${BRAND.evergreen}}.ll-post .post-body h2{font-size:2.1rem}.ll-post .post-body h3{font-size:1.6rem}`}</style>
              <PostBody doc={post.content} />
            </div>
            <div className="mt-16 flex flex-wrap items-end justify-between gap-6 rounded px-8 py-10" style={{ background: BRAND.evergreen, color: BRAND.ivory }}>
              <p className="text-4xl leading-[0.95]" style={serif}>A website that moves<br />as fast as your market<span style={{ color: BRAND.brass }}>.</span></p>
              <Link href="/signup" className="rounded-[2px] px-6 py-4 font-semibold" style={{ background: BRAND.brass, color: BRAND.evergreen }}>launch my site.</Link>
            </div>
          </div>
          {showToc && (
            <aside>
              <TableOfContents toc={toc} variant="sidebar" />
            </aside>
          )}
        </div>
      </article>
      <MarketingFooter />
    </MarketingFrame>
  );
}
