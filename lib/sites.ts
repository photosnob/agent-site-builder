import { createAdminClient } from "@/lib/supabase/server";
import type { SiteAsset, SiteRow } from "@/lib/types";

export async function getPublishedSiteBySlug(slug: string) {
  const admin = createAdminClient();
  // Select only what the public page needs.
  const { data } = await admin
    .from("sites")
    .select("id, slug, status, agent, published_content, published_theme")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();
  return data as Pick<SiteRow, "id" | "slug" | "status" | "agent" | "published_content" | "published_theme"> | null;
}

export async function getAssets(siteId: string): Promise<SiteAsset[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_assets").select("id, kind, url, meta").eq("site_id", siteId).order("created_at");
  return (data as SiteAsset[]) ?? [];
}

export const headshotOf = (assets: SiteAsset[]) => assets.find((a) => a.kind === "headshot")?.url;
