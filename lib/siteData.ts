import { createAdminClient } from "./supabase/server";
import type { PageContent } from "./blocks/schema";
import { getInstagramPosts, type IgPost } from "./instagram";

export interface Listing {
  id: string;
  address: string;
  city: string | null;
  price: string | null;
  status: "active" | "pending" | "sold" | "coming-soon";
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  description: string | null;
  photos: string[];
  link_url: string | null;
  featured: boolean;
  position: number;
}
export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  context: string | null;
  rating: number | null;
  source: string;
  visible: boolean;
  featured: boolean;
  position: number;
}
export interface TeamMember {
  id: string;
  name: string;
  title: string | null;
  photo: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  license: string | null;
  position: number;
}
export interface SitePage {
  id: string;
  site_id: string;
  slug: string;
  kind: "buy" | "sell" | "team" | "reviews" | "custom";
  title: string;
  nav_label: string;
  enabled: boolean;
  position: number;
  content: PageContent;
  published_content: PageContent | null;
  seo_title: string | null;
  meta_description: string | null;
  updated_at: string;
}
export interface NavPage { slug: string; label: string }

/** Data that data-driven sections (listings, reviews, team, recent posts) render from. */
export interface SiteData {
  listings: Listing[];
  testimonials: Testimonial[];
  team: TeamMember[];
  posts: { slug: string; title: string; excerpt: string | null; cover_image: string | null; published_at: string | null }[];
  nav: NavPage[];
  instagram: { username: string | null; posts: IgPost[] } | null;
}

export const EMPTY_DATA: SiteData = { listings: [], testimonials: [], team: [], posts: [], nav: [], instagram: null };

/**
 * Loads everything a public page might render. Tolerates missing tables, so a
 * site keeps working if a migration hasn't been run yet.
 */
export async function getSiteData(siteId: string, { publishedPagesOnly = true } = {}): Promise<SiteData> {
  const admin = createAdminClient();
  const safe = async <T,>(p: PromiseLike<{ data: T[] | null; error: unknown }>) => {
    try { const { data, error } = await p; return error ? [] : (data ?? []); } catch { return []; }
  };
  const [listings, testimonials, team, posts, pages, instagram] = await Promise.all([
    safe<Listing>(admin.from("site_listings").select("*").eq("site_id", siteId).order("position").order("created_at", { ascending: false })),
    safe<Testimonial>(admin.from("testimonials").select("*").eq("site_id", siteId).eq("visible", true).order("position").order("created_at", { ascending: false })),
    safe<TeamMember>(admin.from("team_members").select("*").eq("site_id", siteId).order("position").order("created_at")),
    safe<SiteData["posts"][number]>(admin.from("blog_posts").select("slug, title, excerpt, cover_image, published_at").eq("site_id", siteId).eq("status", "published").order("published_at", { ascending: false }).limit(6)),
    safe<Pick<SitePage, "slug" | "nav_label" | "enabled" | "published_content" | "position">>(admin.from("site_pages").select("slug, nav_label, enabled, published_content, position").eq("site_id", siteId).order("position")),
    getInstagramPosts(siteId).catch(() => null),
  ]);
  const nav = pages.filter((p) => p.enabled && (!publishedPagesOnly || p.published_content)).map((p) => ({ slug: p.slug, label: p.nav_label }));
  return { listings, testimonials, team, posts, nav, instagram };
}

export async function getPublishedPage(siteId: string, slug: string) {
  try {
    const { data } = await createAdminClient().from("site_pages").select("*").eq("site_id", siteId).eq("slug", slug).eq("enabled", true).maybeSingle();
    return (data as SitePage | null)?.published_content ? (data as SitePage) : null;
  } catch {
    return null;
  }
}

/** Listings shown in a featured-listings section: hand-entered ones win over imported block items. */
export function listingsForBlock(data: SiteData) {
  return data.listings.filter((l) => l.featured && l.photos.length > 0);
}

/** Reviews for a section. Home ("featured") falls back to the newest visible ones. */
export function reviewsFor(data: SiteData, mode: "all" | "featured") {
  if (mode === "all") return data.testimonials;
  const featured = data.testimonials.filter((t) => t.featured);
  return (featured.length ? featured : data.testimonials).slice(0, 6);
}
