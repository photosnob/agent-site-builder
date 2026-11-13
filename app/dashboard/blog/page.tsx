import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { NewPostButton } from "@/components/blog/NewPostButton";
import { PostList, type PostListItem } from "@/components/blog/PostList";
import { DashNav } from "@/components/app/DashNav";
import { publicSiteUrl } from "@/lib/siteUrls";

export const dynamic = "force-dynamic";

export default async function BlogDashboard() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/dashboard/blog");
  const { data: site } = await supabase.from("sites").select("id, slug, status").eq("owner_id", user.id).maybeSingle();
  if (!site) redirect("/onboarding");
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, slug, title, status, published_at, updated_at")
    .eq("site_id", site.id)
    .order("updated_at", { ascending: false });
  const blogUrl = `${publicSiteUrl(site.slug)}/blog`;

  return (
    <>
    <DashNav active="/dashboard/blog" liveUrl={site.status === "live" ? publicSiteUrl(site.slug) : null} />
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Blog</h1>
        </div>
        <div className="flex gap-2">
          {site.status === "live" && <a href={blogUrl} target="_blank" className="btn-ghost">View blog ↗</a>}
          <NewPostButton siteId={site.id} />
        </div>
      </div>
      {site.status !== "live" && (
        <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Publish your site first. Blog posts appear once the site is live.</p>
      )}
      <PostList posts={(posts ?? []) as PostListItem[]} apiBase={`/api/sites/${site.id}/posts`} editBase="/dashboard/blog" empty="No posts yet. Neighborhood guides and market updates are a great place to start." />
    </main>
    </>
  );
}
