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
  }),
});

export const AboutBlock = z.object({
  type: z.literal("about"),
  id: blockId,
  props: z.object({
    headline: plain(90),
    body: plain(1400),
    image: imageRef.optional(),
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

export const Block = z.discriminatedUnion("type", [
  HeroBlock,
  AboutBlock,
  FeaturedListingsBlock,
  NeighborhoodsBlock,
  TestimonialsBlock,
  StatsBlock,
  CtaBlock,
  ContactBlock,
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
  });
export type SiteContent = z.infer<typeof SiteContent>;

/** Collect every image URL a content tree references. */
export function imagesIn(content: SiteContent): string[] {
  const out: string[] = [];
  for (const b of content.blocks) {
    if ((b.type === "hero" || b.type === "about") && b.props.image) out.push(b.props.image);
    if (b.type === "featured-listings") b.props.items.forEach((i) => out.push(i.image));
  }
  return out;
}

export function newBlockId(type: string) {
  return `${type.slice(0, 12)}-${Math.random().toString(36).slice(2, 8)}`;
}
