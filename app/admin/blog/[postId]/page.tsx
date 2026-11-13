import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { PostEditor } from "@/components/blog/PostEditor";
import { appUrl } from "@/lib/siteUrls";

export const dynamic = "force-dynamic";

export default async function EditPlatformPost({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const { user } = await requireUser();
  if (!user) redirect(`/login?next=/admin/blog/${postId}`);
  if (!isAdminEmail(user.email)) notFound();
  const { data: post } = await createAdminClient().from("platform_posts").select("*").eq("id", postId).maybeSingle();
  if (!post) notFound();
  return (
    <PostEditor
      post={post}
      publicBase=""
      canonicalBase={appUrl()}
      agentName="Launch & List"
      endpoints={{ post: `/api/admin/posts/${post.id}`, upload: "/api/admin/assets", back: "/admin/blog" }}
    />
  );
}
