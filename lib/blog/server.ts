import { createAdminClient } from "@/lib/supabase/server";
import type { PostDoc } from "./content";

export interface PostRow {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  meta_description: string | null;
  cover_image: string | null;
  content: PostDoc;
  show_toc: boolean;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
}

/** Public URL prefix for this site's uploads. Post images must start with it. */
export function siteImagePrefix(siteId: string) {
  const { data } = createAdminClient().storage.from("site-assets").getPublicUrl(`${siteId}/`);
  return data.publicUrl;
}

export async function getPublishedPosts(siteId: string, limit = 50) {
  const { data } = await createAdminClient()
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image, published_at, updated_at")
    .eq("site_id", siteId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Pick<PostRow, "id" | "slug" | "title" | "excerpt" | "cover_image" | "published_at" | "updated_at">[];
}

export async function getPublishedPost(siteId: string, slug: string) {
  const { data } = await createAdminClient()
    .from("blog_posts")
    .select("*")
    .eq("site_id", siteId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data as PostRow | null;
}
