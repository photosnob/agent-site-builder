import { createAdminClient } from "@/lib/supabase/server";
import { siteImagePrefix, type PostRow } from "./server";

/**
 * Launch & List's own blog (launchandlist.com/blog). Posts live in
 * platform_posts and their images under "platform/" in the site-assets bucket.
 */
export const PLATFORM_ASSET_FOLDER = "platform";
export const platformImagePrefix = () => siteImagePrefix(PLATFORM_ASSET_FOLDER);

export type PlatformPostRow = Omit<PostRow, "site_id"> & { created_at: string };

const LIST_COLUMNS = "id, slug, title, excerpt, meta_description, cover_image, published_at, updated_at";

export async function getPublishedPlatformPosts(limit = 100) {
  try {
    const { data } = await createAdminClient()
      .from("platform_posts")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as Pick<PlatformPostRow, "id" | "slug" | "title" | "excerpt" | "meta_description" | "cover_image" | "published_at" | "updated_at">[];
  } catch {
    return []; // table not migrated yet, or Supabase not configured
  }
}

export async function getPublishedPlatformPost(slug: string) {
  try {
    const { data } = await createAdminClient().from("platform_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
    return data as PlatformPostRow | null;
  } catch {
    return null;
  }
}
