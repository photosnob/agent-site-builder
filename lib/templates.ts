import type { Theme } from "@/lib/blocks/theme";
import type { BlockType } from "@/lib/blocks/schema";

export type TemplateId = "modern" | "estate" | "midcentury" | "noir" | "riviera" | "bright" | "monument" | "heritage";

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  theme: Theme;
  /** Palettes a prompt may switch to while staying in this template's style. */
  allowedPalettes: Theme["palette"][];
  /** Retired from the picker; existing sites on it keep working. */
  hidden?: boolean;
  /** Short line for the template picker's preview card. */
  preview?: { dark: boolean; headline: string };
  /** Default page structure. Generation fills these; edits may add/remove optional ones. */
  layout: BlockType[];
  voiceHint: string;
}

export const TEMPLATES: Record<TemplateId, Template> = {
  modern: {
    id: "modern",
    hidden: true,
    name: "Classic Modern",
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
    hidden: true,
    name: "Mid-Century",
    description: "Geometric type and teak/atomic colors for architectural specialists.",
    theme: { palette: "teak", fonts: "geometric", radius: "round", heroStyle: "centered", look: "classic" },
    allowedPalettes: ["teak", "atomic", "forest", "ink"],
    layout: ["hero", "about", "neighborhoods", "featured-listings", "testimonials", "cta", "contact"],
    voiceHint: "knowledgeable, warm, design-literate; specific about architecture",
  },
  monument: {
    id: "monument",
    name: "Modern",
    description: "Oversized type and an oxblood statement section; photos slide over each other as you scroll.",
    theme: { palette: "monument", fonts: "monument", radius: "none", heroStyle: "full-bleed", look: "monument" },
    allowedPalettes: ["monument", "monument-ink"],
    layout: ["hero", "about", "stats", "featured-listings", "neighborhoods", "testimonials", "cta", "contact"],
    voiceHint: "confident, direct, few words; statements rather than sales talk",
  },
  heritage: {
    id: "heritage",
    name: "Heritage",
    description: "Navy and copper with spaced capitals; a cinematic hero and photos that drift as you scroll.",
    theme: { palette: "heritage", fonts: "heritage", radius: "none", heroStyle: "full-bleed", look: "heritage" },
    allowedPalettes: ["heritage", "heritage-slate"],
    layout: ["hero", "about", "stats", "featured-listings", "neighborhoods", "cta", "testimonials", "contact"],
    voiceHint: "polished, reassuring, service-minded; understated luxury",
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

/** Templates offered to new sites, in display order (retired ones stay in TEMPLATES for existing sites). */
const ORDER: TemplateId[] = ["monument", "estate", "heritage", "noir", "riviera", "bright"];
export const TEMPLATE_LIST = ORDER.map((id) => TEMPLATES[id]).filter((t) => !t.hidden);
