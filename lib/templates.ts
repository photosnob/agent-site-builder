import type { Theme } from "@/lib/blocks/theme";
import type { BlockType } from "@/lib/blocks/schema";

export type TemplateId = "modern" | "estate" | "midcentury";

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  theme: Theme;
  /** Palettes a prompt may switch to while staying in this template's style. */
  allowedPalettes: Theme["palette"][];
  /** Default page structure. Generation fills these; edits may add/remove optional ones. */
  layout: BlockType[];
  voiceHint: string;
}

export const TEMPLATES: Record<TemplateId, Template> = {
  modern: {
    id: "modern",
    name: "Modern",
    description: "Clean sans-serif, lots of white space, listings up front.",
    theme: { palette: "navy", fonts: "sans-modern", radius: "soft", heroStyle: "split" },
    allowedPalettes: ["navy", "ink", "forest", "midnight"],
    layout: ["hero", "featured-listings", "about", "stats", "neighborhoods", "testimonials", "cta", "contact"],
    voiceHint: "direct, confident, friendly; short sentences",
  },
  estate: {
    id: "estate",
    name: "Estate",
    description: "Editorial serif and warm neutrals for luxury and legacy brands.",
    theme: { palette: "champagne", fonts: "serif-classic", radius: "none", heroStyle: "full-bleed" },
    allowedPalettes: ["champagne", "midnight", "ink", "forest"],
    layout: ["hero", "about", "featured-listings", "testimonials", "neighborhoods", "cta", "contact"],
    voiceHint: "polished, understated, discreet; avoid hype",
  },
  midcentury: {
    id: "midcentury",
    name: "Mid-Century",
    description: "Geometric type and teak/atomic colors for architectural specialists.",
    theme: { palette: "teak", fonts: "geometric", radius: "round", heroStyle: "centered" },
    allowedPalettes: ["teak", "atomic", "forest", "ink"],
    layout: ["hero", "about", "neighborhoods", "featured-listings", "testimonials", "cta", "contact"],
    voiceHint: "knowledgeable, warm, design-literate; specific about architecture",
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);
