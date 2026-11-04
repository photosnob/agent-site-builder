import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAssets } from "@/lib/sites";
import { getPublishedPosts } from "@/lib/blog/server";
import { canonicalOrigin } from "@/lib/siteUrls";
import { defaultDescription, defaultTitle, llmsTxt } from "@/lib/seo/files";
import { SiteSeo } from "@/lib/seo/schema";
import { SeoSettings } from "@/components/seo/SeoSettings";
import { ProfileSettings } from "@/components/seo/ProfileSettings";
import { briefBio } from "@/lib/social";
import type { SiteRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/dashboard/settings");
  const { data } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  const site = data as SiteRow | null;
  if (!site) redirect("/onboarding");

  const parsed = SiteSeo.safeParse(site.seo ?? {});
  const seo = parsed.success ? parsed.data : {};
  const content = site.published_content ?? site.content;
  const origin = canonicalOrigin(site.slug);
  const [assets, posts] = await Promise.all([getAssets(site.id), getPublishedPosts(site.id, 1000)]);
  const generatedLlms = llmsTxt({ slug: site.slug, origin, agent: site.agent, content, seo: { ...seo, llmsTxt: undefined }, publishedAt: site.published_at }, posts);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-900">← Site editor</Link>
      <h1 className="mt-2 text-3xl font-bold">Settings</h1>
      <div className="mt-8">
        <ProfileSettings
          siteId={site.id}
          initial={{ shortBio: site.agent.shortBio, socials: site.agent.socials }}
          bioPlaceholder={briefBio((() => { const a = content?.blocks.find((b) => b.type === "about"); return a?.type === "about" ? a.props.body : site.agent.bio; })()) || "e.g. Jane helps buyers and sellers across Willow Glen with a calm, clear process."}
        />
      </div>
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
  );
}
