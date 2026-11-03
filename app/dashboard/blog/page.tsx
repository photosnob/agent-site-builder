import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { NewPostButton } from "@/components/blog/NewPostButton";
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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-900">← Site editor</Link>
          <h1 className="mt-2 text-3xl font-bold">Blog</h1>
        </div>
        <div className="flex gap-2">
          {site.status === "live" && <a href={blogUrl} target="_blank" className="btn-ghost">View blog ↗</a>}
          <NewPostButton siteId={site.id} />
        </div>
      </div>
      {site.status !== "live" && (
        <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Publish your site first. Blog posts appear once the site is live.</p>
      )}
      <div className="mt-8 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
        {(posts ?? []).length === 0 && <p className="p-8 text-center text-sm text-stone-500">No posts yet. Neighborhood guides and market updates are a great place to start.</p>}
        {(posts ?? []).map((p) => (
          <Link key={p.id} href={`/dashboard/blog/${p.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-stone-50">
            <div className="min-w-0">
              <p className="truncate font-medium">{p.title}</p>
              <p className="text-xs text-stone-500">/blog/{p.slug} · edited {new Date(p.updated_at).toLocaleDateString()}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
              {p.status === "published" ? "Published" : "Draft"}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
