import { z } from "zod";
import { SiteContent, type AnyContent } from "@/lib/blocks/schema";
import { Theme } from "@/lib/blocks/theme";

/** Hero settings from the editor's hero panel (saved, or previewed before saving). */
export const HeroSettings = z.object({
  heroStyle: z.enum(["full-bleed", "split", "centered", "video", "slideshow"]),
  image: z.string().url().max(800).nullable().optional(),
  videoUrl: z.string().url().max(800).nullable().optional(),
  videoSpeed: z.number().min(0.25).max(2).optional(),
  slides: z.array(z.string().url().max(800)).max(8).optional(),
  secondaryCtaLabel: z.string().trim().max(30).nullable().optional(),
  secondaryCtaTarget: z.enum(["contact", "valuation", "listings"]).nullable().optional(),
});
export type HeroSettings = z.infer<typeof HeroSettings>;

/** Photos must come from the site's own library; videos from the library or the stock clips. */
export function heroMediaError(h: HeroSettings, ownPrefix: string, stockPrefix: string): string | null {
  const mine = (u?: string | null) => !u || u.startsWith(ownPrefix);
  if (!mine(h.image) || !(h.slides ?? []).every((u) => u.startsWith(ownPrefix))) return "Photos must come from your library";
  if (h.videoUrl && !h.videoUrl.startsWith(ownPrefix) && !h.videoUrl.startsWith(stockPrefix)) return "Videos must be uploaded or chosen from the stock library";
  return null;
}

/** The site's content and theme with these hero settings applied, or null if the result isn't valid. */
export function applyHero(content: AnyContent, theme: Theme, h: HeroSettings): { content: SiteContent; theme: Theme } | null {
  const blocks = content.blocks.map((blk) => {
    if (blk.type !== "hero") return blk;
    const props = { ...blk.props };
    if (h.image !== undefined) { if (h.image) props.image = h.image; else delete props.image; }
    if (h.videoUrl !== undefined) { if (h.videoUrl) props.videoUrl = h.videoUrl; else delete props.videoUrl; }
    if (h.videoSpeed !== undefined) { if (h.videoSpeed === 1) delete props.videoSpeed; else props.videoSpeed = h.videoSpeed; }
    if (h.slides !== undefined) props.slides = h.slides;
    if (h.secondaryCtaLabel !== undefined) {
      if (h.secondaryCtaLabel && h.secondaryCtaTarget) { props.secondaryCtaLabel = h.secondaryCtaLabel; props.secondaryCtaTarget = h.secondaryCtaTarget; }
      else { delete props.secondaryCtaLabel; delete props.secondaryCtaTarget; }
    }
    return { ...blk, props };
  });
  const c = SiteContent.safeParse({ blocks });
  const t = Theme.safeParse({ ...theme, heroStyle: h.heroStyle });
  return c.success && t.success ? { content: c.data, theme: t.data } : null;
}

/** Compact, URL-safe encoding for passing unsaved hero settings to the preview. */
export function encodeHero(h: HeroSettings): string {
  const bytes = new TextEncoder().encode(JSON.stringify(h));
  let s = ""; bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeHero(v: string): HeroSettings | null {
  try {
    const bin = atob(v.replace(/-/g, "+").replace(/_/g, "/"));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const r = HeroSettings.safeParse(JSON.parse(json));
    return r.success ? r.data : null;
  } catch { return null; }
}
