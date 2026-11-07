import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAssets } from "@/lib/sites";
import { getPublishedPosts } from "@/lib/blog/server";
import { canonicalOrigin } from "@/lib/siteUrls";
import { defaultDescription, defaultTitle, llmsTxt } from "@/lib/seo/files";
import { SiteSeo } from "@/lib/seo/schema";
import { SeoSettings } from "@/components/seo/SeoSettings";
import { DashNav } from "@/components/app/DashNav";
import { LogoSettings } from "@/components/seo/LogoSettings";
import { HeadshotSettings } from "@/components/seo/HeadshotSettings";
import { InstagramSettings } from "@/components/seo/InstagramSettings";
import { getInstagramPosts, instagramConfigured } from "@/lib/instagram";
import { createAdminClient } from "@/lib/supabase/server";
import { publicSiteUrl } from "@/lib/siteUrls";
import { ProfileSettings } from "@/components/seo/ProfileSettings";
import { briefBio } from "@/lib/social";
import type { SiteRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ig?: string }> }) {
  const { ig } = await searchParams;
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/dashboard/settings");
  const { data } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  const site = data as SiteRow | null;
  if (!site) redirect("/onboarding");

  const parsed = SiteSeo.safeParse(site.seo ?? {});
  const seo = parsed.success ? parsed.data : {};
  const content = site.published_content ?? site.content;
  const origin = canonicalOrigin(site.slug);
  const [assets, posts, igRow, igPosts, redirects] = await Promise.all([
    getAssets(site.id),
    getPublishedPosts(site.id, 1000),
    createAdminClient().from("instagram_connections").select("username, expires_at, last_error").eq("site_id", site.id).maybeSingle().then((r) => r.data, () => null),
    getInstagramPosts(site.id).catch(() => null),
    supabase.from("site_redirects").select("needs_review").eq("site_id", site.id).then((r) => (r.error ? null : r.data ?? []), () => null),
  ]);
  const needsLook = redirects?.filter((r) => r.needs_review).length ?? 0;
  const generatedLlms = llmsTxt({ slug: site.slug, origin, agent: site.agent, content, seo: { ...seo, llmsTxt: undefined }, publishedAt: site.published_at }, posts);

  return (
    <>
    <DashNav active="/dashboard/settings" liveUrl={site.status === "live" ? publicSiteUrl(site.slug) : null} />
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="mt-8">
        <HeadshotSettings siteId={site.id} current={(() => { const h = assets.find((a) => a.kind === "headshot"); return h ? { url: h.url, originalUrl: h.meta?.originalUrl, crop: h.meta?.crop } : null; })()} agentName={site.agent.name ?? ""} />
      </div>
      <div className="mt-6">
        <LogoSettings siteId={site.id} current={assets.find((a) => a.kind === "logo")?.url ?? null} agentName={site.agent.name ?? ""} />
      </div>
      <div className="mt-6">
        <InstagramSettings
          siteId={site.id}
          configured={instagramConfigured()}
          status={ig}
          showing={Boolean(site.content?.blocks.some((b) => b.type === "instagram"))}
          connection={igRow ? { username: igRow.username, expiresAt: igRow.expires_at, lastError: igRow.last_error, postCount: igPosts?.posts.length ?? 0 } : null}
        />
      </div>
      <div className="mt-6">
        <ProfileSettings
          siteId={site.id}
          initial={{ shortBio: site.agent.shortBio, socials: site.agent.socials }}
          bioPlaceholder={briefBio((() => { const a = content?.blocks.find((b) => b.type === "about"); return a?.type === "about" ? a.props.body : site.agent.bio; })()) || "e.g. Jane helps buyers and sellers across Willow Glen with a calm, clear process."}
        />
      </div>
      <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-5">
        <div>
          <h2 className="font-semibold">Redirects</h2>
          <p className="mt-1 max-w-xl text-sm text-stone-500">
            Send visitors and Google from your old website&apos;s pages to the right pages here, so you keep your rankings.{" "}
            {redirects === null ? "Needs the 0007 database migration." : redirects.length ? `${redirects.length} set up${needsLook ? `, ${needsLook} need a look` : ""}.` : "None yet."}
          </p>
        </div>
        <Link href="/dashboard/redirects" className="btn-ghost">Manage redirects</Link>
      </section>
      <SeoSettings
        siteId={site.id}
        live={site.status === "live"}
        origin={origin}
        hostedRoot={Boolean(process.env.NEXT_PUBLIC_ROOT_DOMAIN)}
        initial={seo}
        defaults={{ title: defaultTitle(site.agent), description: defaultDescription(site.agent, content) }}
        images={assets.map((a) => ({ id: a.id, url: a.url, kind: a.kind }))}
        generatedLlms={generatedLlms}
        postCount={posts.length}
      />
    </main>
    </>
  );
}
