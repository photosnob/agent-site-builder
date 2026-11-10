import type { Theme } from "@/lib/blocks/theme";
import type { BlockType } from "@/lib/blocks/schema";

export type TemplateId = "modern" | "estate" | "midcentury" | "noir" | "riviera" | "bright";

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  theme: Theme;
  /** Palettes a prompt may switch to while staying in this template's style. */
  allowedPalettes: Theme["palette"][];
  /** Short line for the template picker's preview card. */
  preview?: { dark: boolean; headline: string };
  /** Default page structure. Generation fills these; edits may add/remove optional ones. */
  layout: BlockType[];
  voiceHint: string;
}

export const TEMPLATES: Record<TemplateId, Template> = {
  modern: {
    id: "modern",
    name: "Modern",
    description: "Clean sans-serif, lots of white space, listings up front.",
    theme: { palette: "navy", fonts: "sans-modern", radius: "soft", heroStyle: "split", look: "classic" },
    allowedPalettes: ["navy", "ink", "forest", "midnight"],
    layout: ["hero", "featured-listings", "about", "stats", "neighborhoods", "testimonials", "cta", "contact"],
    voiceHint: "direct, confident, friendly; short sentences",
  },
  estate: {
    id: "estate",
    name: "Estate",
    description: "Editorial serif and warm neutrals for luxury and legacy brands.",
    theme: { palette: "champagne", fonts: "serif-classic", radius: "none", heroStyle: "full-bleed", look: "classic" },
    allowedPalettes: ["champagne", "midnight", "ink", "forest"],
    layout: ["hero", "about", "featured-listings", "testimonials", "neighborhoods", "cta", "contact"],
    voiceHint: "polished, understated, discreet; avoid hype",
  },
  midcentury: {
    id: "midcentury",
    name: "Mid-Century",
    description: "Geometric type and teak/atomic colors for architectural specialists.",
    theme: { palette: "teak", fonts: "geometric", radius: "round", heroStyle: "centered", look: "classic" },
    allowedPalettes: ["teak", "atomic", "forest", "ink"],
    layout: ["hero", "about", "neighborhoods", "featured-listings", "testimonials", "cta", "contact"],
    voiceHint: "knowledgeable, warm, design-literate; specific about architecture",
  },
  noir: {
    id: "noir",
    name: "Noir",
    description: "Dark and cinematic: a video hero, listings in a scrolling rail, photo-led neighborhoods.",
    theme: { palette: "noir", fonts: "montserrat", radius: "none", heroStyle: "video", look: "noir" },
    allowedPalettes: ["noir", "noir-gold"],
    layout: ["hero", "about", "stats", "featured-listings", "neighborhoods", "testimonials", "cta", "contact"],
    voiceHint: "personal, grounded, first person; calm confidence, no hype",
  },
  riviera: {
    id: "riviera",
    name: "Riviera",
    description: "A dark film hero with tall serif type that opens into a light, gallery-like page.",
    theme: { palette: "riviera", fonts: "riviera", radius: "none", heroStyle: "video", look: "riviera" },
    allowedPalettes: ["riviera", "riviera-sage"],
    layout: ["hero", "about", "featured-listings", "cta", "stats", "testimonials", "neighborhoods", "contact"],
    voiceHint: "refined, evocative, unhurried; describe places and light, never hype",
  },
  bright: {
    id: "bright",
    name: "Bright",
    description: "White and bold: big sans headlines in two tones, pill buttons, rounded photos.",
    theme: { palette: "bright", fonts: "grotesk", radius: "round", heroStyle: "full-bleed", look: "bright" },
    allowedPalettes: ["bright", "bright-cobalt"],
    layout: ["hero", "about", "featured-listings", "stats", "testimonials", "neighborhoods", "cta", "contact"],
    voiceHint: "plainspoken, modern, energetic; short punchy sentences",
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);
