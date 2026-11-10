import { z } from "zod";

/**
 * Design tokens. Prompts can switch between curated palettes and fonts, never
 * arbitrary colors, so every site stays readable and on-brand.
 */

export const PALETTES = {
  ink: { bg: "#ffffff", surface: "#f5f5f4", text: "#1c1917", muted: "#57534e", accent: "#1c1917", accentText: "#ffffff" },
  navy: { bg: "#ffffff", surface: "#f1f5f9", text: "#0f172a", muted: "#475569", accent: "#1e3a5f", accentText: "#ffffff" },
  champagne: { bg: "#fbf8f3", surface: "#f2ebe0", text: "#2a2420", muted: "#6b5f55", accent: "#9a7b4f", accentText: "#ffffff" },
  forest: { bg: "#fafaf7", surface: "#eef0ea", text: "#1f2a1f", muted: "#5a655a", accent: "#2f5d46", accentText: "#ffffff" },
  teak: { bg: "#fcf7ef", surface: "#f3e7d3", text: "#2b1d12", muted: "#6e5440", accent: "#c0532b", accentText: "#ffffff" },
  atomic: { bg: "#f7f4ec", surface: "#e9efe9", text: "#22262a", muted: "#5b6168", accent: "#2a7f86", accentText: "#ffffff" },
  midnight: { bg: "#0f1115", surface: "#181b22", text: "#f3f2ef", muted: "#a3a6ad", accent: "#d6b77a", accentText: "#14161b" },
  // Noir look: near-black, warm off-white type, one quiet accent for labels.
  noir: { bg: "#101314", surface: "#191d1f", text: "#efece7", muted: "#a39e97", accent: "#d9776f", accentText: "#101314" },
  "noir-gold": { bg: "#101314", surface: "#191d1f", text: "#efece7", muted: "#a39e97", accent: "#cdb07a", accentText: "#101314" },
  // Riviera look: gallery ivory with near-black; dark bands come from the look itself.
  riviera: { bg: "#fafaf9", surface: "#f0ede7", text: "#1c1917", muted: "#6b6560", accent: "#1c1917", accentText: "#fafaf9" },
  "riviera-sage": { bg: "#f8f8f4", surface: "#ebede4", text: "#1d221c", muted: "#5f665c", accent: "#3e4a3a", accentText: "#f8f8f4" },
  // Bright look: white, black type, grey for the second half of two-tone headlines.
  bright: { bg: "#ffffff", surface: "#f3f3f1", text: "#0b0b0b", muted: "#6f6f6b", accent: "#151717", accentText: "#ffffff" },
  "bright-cobalt": { bg: "#ffffff", surface: "#f1f4f9", text: "#0b1220", muted: "#667085", accent: "#1d4ed8", accentText: "#ffffff" },
} as const;
export type PaletteName = keyof typeof PALETTES;

export const FONT_PAIRS = {
  "serif-classic": { heading: "'Playfair Display', Georgia, serif", body: "'Inter', system-ui, sans-serif", google: "Playfair+Display:wght@500;700&family=Inter:wght@400;500;600" },
  "sans-modern": { heading: "'Manrope', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", google: "Manrope:wght@600;800&family=Inter:wght@400;500;600" },
  "geometric": { heading: "'Josefin Sans', system-ui, sans-serif", body: "'Work Sans', system-ui, sans-serif", google: "Josefin+Sans:wght@500;700&family=Work+Sans:wght@400;500;600" },
  "editorial": { heading: "'Cormorant Garamond', Georgia, serif", body: "'Lato', system-ui, sans-serif", google: "Cormorant+Garamond:wght@500;700&family=Lato:wght@400;700" },
  "montserrat": { heading: "'Montserrat', system-ui, sans-serif", body: "'Montserrat', system-ui, sans-serif", google: "Montserrat:wght@300;400;500;600" },
  "riviera": { heading: "'Cormorant Garamond', Georgia, serif", body: "'Nunito Sans', system-ui, sans-serif", google: "Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Nunito+Sans:wght@300;400;600" },
  "grotesk": { heading: "'Instrument Sans', system-ui, sans-serif", body: "'Instrument Sans', system-ui, sans-serif", google: "Instrument+Sans:wght@400;500;600;700" },
} as const;
export type FontPairName = keyof typeof FONT_PAIRS;

export const LOOKS = ["classic", "noir", "riviera", "bright"] as const;
export type Look = (typeof LOOKS)[number];

export const Theme = z.object({
  palette: z.enum(Object.keys(PALETTES) as [PaletteName, ...PaletteName[]]),
  fonts: z.enum(Object.keys(FONT_PAIRS) as [FontPairName, ...FontPairName[]]),
  radius: z.enum(["none", "soft", "round"]),
  heroStyle: z.enum(["full-bleed", "split", "centered", "video", "slideshow"]),
  /**
   * Layout family, set by the template (never by prompts). "classic" is the
   * original block layouts; the others restyle header, hero and sections.
   */
  look: z.enum(LOOKS).default("classic"),
});
export type Theme = z.infer<typeof Theme>;

export const RADII = { none: "0px", soft: "8px", round: "20px" } as const;

export function themeVars(t: Theme): Record<string, string> {
  const p = PALETTES[t.palette];
  const f = FONT_PAIRS[t.fonts];
  return {
    "--bg": p.bg,
    "--surface": p.surface,
    "--text": p.text,
    "--muted": p.muted,
    "--accent": p.accent,
    "--accent-text": p.accentText,
    "--font-heading": f.heading,
    "--font-body": f.body,
    "--radius": RADII[t.radius],
  };
}
