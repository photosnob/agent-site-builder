import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PostEditor } from "@/components/blog/PostEditor";
import { publicSiteUrl } from "@/lib/siteUrls";

export const dynamic = "force-dynamic";

export default async function EditPost({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const { supabase, user } = await requireUser();
  if (!user) redirect(`/login?next=/dashboard/blog/${postId}`);
  const { data: site } = await supabase.from("sites").select("id, slug").eq("owner_id", user.id).maybeSingle();
  if (!site) redirect("/onboarding");
  const { data: post } = await supabase.from("blog_posts").select("*").eq("id", postId).eq("site_id", site.id).maybeSingle();
  if (!post) notFound();
  return <PostEditor siteId={site.id} post={post} publicBase={publicSiteUrl(site.slug)} />;
}
