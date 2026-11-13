import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { NewPostButton } from "@/components/blog/NewPostButton";
import { PostList, type PostListItem } from "@/components/blog/PostList";
import { ProfileMenu } from "@/components/app/ProfileMenu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog · Admin" };

export default async function AdminBlog() {
  const { user } = await requireUser();
  if (!user) redirect("/login?next=/admin/blog");
  if (!isAdminEmail(user.email)) notFound();
  const { data: posts, error } = await createAdminClient()
    .from("platform_posts")
    .select("id, slug, title, status, published_at, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Admin</p>
          <h1 className="mt-1 text-3xl font-bold">Launch &amp; List blog</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="btn-ghost">AI usage</Link>
          <a href="/blog" target="_blank" className="btn-ghost">View blog ↗</a>
          <NewPostButton createUrl="/api/admin/posts" editBase="/admin/blog" />
          <ProfileMenu links={[{ href: "/dashboard", label: "Dashboard" }]} />
        </div>
      </div>
      {error && (
        <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Couldn&apos;t load posts. Run <code>supabase/migrations/0009_platform_blog.sql</code> in the Supabase SQL editor first.
        </p>
      )}
      <PostList posts={(posts ?? []) as PostListItem[]} apiBase="/api/admin/posts" editBase="/admin/blog" empty={error ? "" : "No posts yet. Write the first one for launchandlist.com/blog."} />
    </main>
  );
}
