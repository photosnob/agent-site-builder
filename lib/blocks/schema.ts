import { z } from "zod";

/**
 * The whole site is data. The AI (and the editor) can only produce values that
 * pass these schemas: no HTML, no scripts, capped lengths, enum-only targets.
 */

const plain = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    // No markup or URLs smuggled into copy fields.
    .refine((s) => !/<[^>]+>|javascript:|data:/i.test(s), "Markup is not allowed in text");

const blockId = z.string().regex(/^[a-z0-9-]{3,40}$/);
/** Images must be assets we host. Checked against the site's asset list at save time. */
const imageRef = z.string().url().max(600);

export const CTA_TARGETS = ["contact", "valuation", "listings"] as const;
export const IMAGE_SIZES = ["small", "medium", "large"] as const;

export const HeroBlock = z.object({
  type: z.literal("hero"),
  id: blockId,
  props: z.object({
    eyebrow: plain(60).optional(),
    headline: plain(90),
    subheadline: plain(220),
    image: imageRef.optional(),
    ctaLabel: plain(30),
    ctaTarget: z.enum(CTA_TARGETS),
    secondaryCtaLabel: plain(30).optional(),
    secondaryCtaTarget: z.enum(CTA_TARGETS).optional(),
    /** Video background (heroStyle "video"): an uploaded or stock MP4/WebM in our storage. */
    videoUrl: z.string().url().max(800).optional(),
    /** Video playback speed, 0.25–2 (1 = normal). */
    videoSpeed: z.number().min(0.25).max(2).optional(),
    /** Slideshow background (heroStyle "slideshow"): up to 8 photos from the library. */
    slides: z.array(imageRef).max(8).optional(),
  }),
});

export const AboutBlock = z.object({
  type: z.literal("about"),
  id: blockId,
  props: z.object({
    headline: plain(90),
    body: plain(1400),
    image: imageRef.optional(),
    imageSize: z.enum(IMAGE_SIZES).optional(),
  }),
});

export const ListingItem = z.object({
  image: imageRef,
  address: plain(120),
  price: plain(30).optional(),
  status: z.enum(["active", "pending", "sold", "coming-soon"]),
  beds: z.number().int().min(0).max(30).optional(),
  baths: z.number().min(0).max(30).optional(),
  sqft: z.number().int().min(0).max(100000).optional(),
});

export const FeaturedListingsBlock = z.object({
  type: z.literal("featured-listings"),
  id: blockId,
  props: z.object({
    headline: plain(90),
    intro: plain(300).optional(),
    items: z.array(ListingItem).max(12),
  }),
});

export const NeighborhoodsBlock = z.object({
  type: z.literal("neighborhoods"),
  id: blockId,
  props: z.object({
    headline: plain(90),
    items: z.array(z.object({ name: plain(60), blurb: plain(320) })).min(1).max(8),
  }),
});

export const TestimonialsBlock = z.object({
  type: z.literal("testimonials"),
  id: blockId,
  props: z.object({
    headline: plain(90),
    items: z.array(z.object({ quote: plain(450), author: plain(60) })).min(1).max(6),
  }),
});

export const StatsBlock = z.object({
  type: z.literal("stats"),
  id: blockId,
  props: z.object({
    items: z.array(z.object({ value: plain(20), label: plain(40) })).min(1).max(4),
  }),
});

export const CtaBlock = z.object({
  type: z.literal("cta"),
  id: blockId,
  props: z.object({
    headline: plain(90),
    body: plain(300),
    buttonLabel: plain(30),
    target: z.enum(CTA_TARGETS),
  }),
});

export const ContactBlock = z.object({
  type: z.literal("contact"),
  id: blockId,
  props: z.object({
    headline: plain(90),
    body: plain(300),
    showPhone: z.boolean(),
  }),
});

/* ---- Sections used mostly on inner pages (Buy, Sell, Team, Success Stories) ---- */

export const PageHeaderBlock = z.object({
  type: z.literal("page-header"),
  id: blockId,
  props: z.object({ eyebrow: plain(60).optional(), headline: plain(90), intro: plain(400).optional(), image: imageRef.optional() }),
});

export const RichTextBlock = z.object({
  type: z.literal("rich-text"),
  id: blockId,
  props: z.object({ headline: plain(90).optional(), body: plain(4000) }), // paragraphs separated by blank lines
});

export const StepsBlock = z.object({
  type: z.literal("steps"),
  id: blockId,
  props: z.object({ headline: plain(90), intro: plain(400).optional(), items: z.array(z.object({ title: plain(80), body: plain(600) })).min(1).max(12) }),
});

export const FaqBlock = z.object({
  type: z.literal("faq"),
  id: blockId,
  props: z.object({ headline: plain(90), items: z.array(z.object({ q: plain(160), a: plain(900) })).min(1).max(12) }),
});

/** Data-driven: renders the agent's team members. */
export const TeamGridBlock = z.object({
  type: z.literal("team-grid"),
  id: blockId,
  props: z.object({ headline: plain(90), intro: plain(400).optional() }),
});

/** Data-driven: renders curated reviews (all visible, or only featured). */
export const ReviewsBlock = z.object({
  type: z.literal("reviews"),
  id: blockId,
  props: z.object({ headline: plain(90), intro: plain(400).optional(), mode: z.enum(["all", "featured"]) }),
});

/** Data-driven: latest blog posts. */
export const RecentPostsBlock = z.object({
  type: z.literal("recent-posts"),
  id: blockId,
  props: z.object({ headline: plain(90), count: z.number().int().min(2).max(6) }),
});

/** Data-driven: the agent's latest Instagram posts (needs a connected account). */
export const InstagramBlock = z.object({
  type: z.literal("instagram"),
  id: blockId,
  props: z.object({ headline: plain(90), count: z.number().int().min(3).max(6) }),
});

export const Block = z.discriminatedUnion("type", [
  HeroBlock,
  AboutBlock,
  FeaturedListingsBlock,
  NeighborhoodsBlock,
  TestimonialsBlock,
  StatsBlock,
  CtaBlock,
  ContactBlock,
  PageHeaderBlock,
  RichTextBlock,
  StepsBlock,
  FaqBlock,
  TeamGridBlock,
  ReviewsBlock,
  RecentPostsBlock,
  InstagramBlock,
]);
export type Block = z.infer<typeof Block>;
export type BlockType = Block["type"];

export const BLOCK_TYPES = [
  "hero",
  "about",
  "featured-listings",
  "neighborhoods",
  "testimonials",
  "stats",
  "cta",
  "contact",
  "page-header",
  "rich-text",
  "steps",
  "faq",
  "team-grid",
  "reviews",
  "recent-posts",
  "instagram",
] as const satisfies readonly BlockType[];

/** Blocks a site must always have, and where. */
export const REQUIRED_BLOCKS: BlockType[] = ["hero", "contact"];

export const SiteContent = z
  .object({ blocks: z.array(Block).min(2).max(16) })
  .superRefine((c, ctx) => {
    const ids = new Set<string>();
    for (const b of c.blocks) {
      if (ids.has(b.id)) ctx.addIssue({ code: "custom", message: `Duplicate block id ${b.id}` });
      ids.add(b.id);
    }
    for (const t of REQUIRED_BLOCKS) {
      if (!c.blocks.some((b) => b.type === t)) ctx.addIssue({ code: "custom", message: `Site needs a ${t} block` });
    }
    if (c.blocks[0]?.type !== "hero") ctx.addIssue({ code: "custom", message: "The hero must be the first block" });
    if (c.blocks.filter((b) => b.type === "hero").length > 1)
      ctx.addIssue({ code: "custom", message: "Only one hero is allowed" });
    if (c.blocks.some((b) => b.type === "page-header")) ctx.addIssue({ code: "custom", message: "The home page uses a hero, not a page header" });
  });
export type SiteContent = z.infer<typeof SiteContent>;

/** Inner pages: start with a page header, never a hero. */
export const PageContent = z
  .object({ blocks: z.array(Block).min(1).max(16) })
  .superRefine((c, ctx) => {
    const ids = new Set<string>();
    for (const b of c.blocks) {
      if (ids.has(b.id)) ctx.addIssue({ code: "custom", message: `Duplicate block id ${b.id}` });
      ids.add(b.id);
    }
    if (c.blocks[0]?.type !== "page-header") ctx.addIssue({ code: "custom", message: "A page must start with its page header" });
    if (c.blocks.filter((b) => b.type === "page-header").length > 1) ctx.addIssue({ code: "custom", message: "Only one page header is allowed" });
    if (c.blocks.some((b) => b.type === "hero")) ctx.addIssue({ code: "custom", message: "Heroes belong on the home page" });
  });
export type PageContent = z.infer<typeof PageContent>;
export type AnyContent = SiteContent | PageContent;

/** Collect every image URL a content tree references. */
export function imagesIn(content: { blocks: Block[] }): string[] {
  const out: string[] = [];
  for (const b of content.blocks) {
    if ((b.type === "hero" || b.type === "about" || b.type === "page-header") && b.props.image) out.push(b.props.image);
    if (b.type === "hero") { b.props.slides?.forEach((u) => out.push(u)); if (b.props.videoUrl) out.push(b.props.videoUrl); }
    if (b.type === "featured-listings") b.props.items.forEach((i) => out.push(i.image));
  }
  return out;
}

export function newBlockId(type: string) {
  return `${type.slice(0, 12)}-${Math.random().toString(36).slice(2, 8)}`;
}
