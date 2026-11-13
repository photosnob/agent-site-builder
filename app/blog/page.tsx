import Link from "next/link";
import type { Metadata } from "next";
import { BRAND } from "@/components/marketing/Brand";
import { MarketingFooter, MarketingFrame, MarketingHeader } from "@/components/marketing/Chrome";
import { getPublishedPlatformPosts } from "@/lib/blog/platform";
import { appUrl } from "@/lib/siteUrls";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Blog | Launch & List" },
  description: "Ideas and how-tos for real estate agents on websites, listings and staying visible online.",
  alternates: { canonical: `${appUrl()}/blog` },
};

const label = "text-[12px] font-medium uppercase tracking-[0.18em]";
const serif = { fontFamily: BRAND.serif, fontWeight: 500, letterSpacing: "-0.01em" } as const;
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "");

export default async function BlogIndex() {
  const posts = await getPublishedPlatformPosts();
  const [lead, ...rest] = posts;
  return (
    <MarketingFrame>
      <div id="top" />
      <MarketingHeader />
      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-10 sm:px-8 lg:pt-16">
        <p className={label} style={{ color: BRAND.taupe }}>the launch &amp; list blog</p>
        <h1 className="mt-5 text-[3rem] leading-[0.95] sm:text-7xl" style={serif}>Notes for agents who move fast<span style={{ color: BRAND.brass }}>.</span></h1>

        {posts.length === 0 && <p className="mt-12 text-lg" style={{ color: BRAND.taupe }}>First posts are on the way.</p>}

        {lead && (
          <Link href={`/blog/${lead.slug}`} className="group mt-14 grid items-center gap-8 border-t pt-10 lg:grid-cols-[1.3fr_1fr]" style={{ borderColor: BRAND.evergreen }}>
            {lead.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lead.cover_image} alt="" className="aspect-[3/2] w-full rounded object-cover transition group-hover:opacity-90" />
            ) : (
              <div className="aspect-[3/2] w-full rounded" style={{ background: BRAND.sand }} />
            )}
            <div>
              <p className={label} style={{ color: BRAND.taupe }}>{fmtDate(lead.published_at)}</p>
              <h2 className="mt-3 text-4xl leading-tight group-hover:underline sm:text-5xl" style={serif}>{lead.title}</h2>
              {lead.excerpt && <p className="mt-4 text-[17px] leading-relaxed" style={{ color: BRAND.ink }}>{lead.excerpt}</p>}
              <p className="mt-6 text-[15px] font-semibold">read it.</p>
            </div>
          </Link>
        )}

        {rest.length > 0 && (
          <div className="mt-16 grid gap-x-8 gap-y-14 border-t pt-10 sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: BRAND.sand }}>
            {rest.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="group block">
                {p.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_image} alt="" loading="lazy" className="aspect-[3/2] w-full rounded object-cover transition group-hover:opacity-90" />
                ) : (
                  <div className="aspect-[3/2] w-full rounded" style={{ background: BRAND.sand }} />
                )}
                <p className={`mt-5 ${label}`} style={{ color: BRAND.taupe }}>{fmtDate(p.published_at)}</p>
                <h2 className="mt-2 text-[1.75rem] leading-tight group-hover:underline" style={serif}>{p.title}</h2>
                {p.excerpt && <p className="mt-2 text-[15px] leading-relaxed" style={{ color: BRAND.ink }}>{p.excerpt}</p>}
              </Link>
            ))}
          </div>
        )}
      </main>
      <MarketingFooter />
    </MarketingFrame>
  );
}
