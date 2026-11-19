import type { Metadata } from "next";
import { getAssets, getPublishedSiteBySlug } from "@/lib/sites";
import { appUrl } from "@/lib/siteUrls";
import type { SiteAsset } from "@/lib/types";

/** Two letters for the fallback icon: "Jane Doe" → "JD", "Casa & Co." → "CC". */
export function initials(name?: string | null): string {
  const words = (name ?? "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "•";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };

/**
 * Where an agent site's icon comes from: their custom icon, else the icon made
 * from their logo (both stored as the "favicon" asset), else an image drawn on
 * request from the logo or their initials.
 */
export function siteIconUrl(site: { id: string; agent: { name?: string | null }; published_theme?: { palette?: string } | null }, assets: Pick<SiteAsset, "kind" | "url">[]): string {
  const icon = assets.find((a) => a.kind === "favicon")?.url;
  if (icon) return icon;
  const logo = assets.find((a) => a.kind === "logo")?.url ?? "";
  return `${appUrl()}/api/site-icon/${site.id}?v=${hash([logo, site.agent.name ?? "", site.published_theme?.palette ?? ""].join("|"))}`;
}

/** Icon metadata for every page of a published agent site. */
export async function siteIconMetadata(slug: string): Promise<Metadata> {
  const site = await getPublishedSiteBySlug(slug);
  if (!site) return {};
  const url = siteIconUrl(site, await getAssets(site.id));
  return { icons: { icon: [{ url, type: "image/png", sizes: "256x256" }], apple: [{ url }] } };
}
