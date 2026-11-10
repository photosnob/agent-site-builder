/** Launch & List brand pieces: colors, fonts, the roofline mark and the wordmark. */
export const BRAND = {
  evergreen: "#1F3A33",
  ivory: "#F6F1E9",
  brass: "#D9A86C",
  taupe: "#6B6458",
  sand: "#E2D9CB",
  ink: "#3A3935",
  sage: "#B7C2BB",
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Inter Tight', system-ui, sans-serif",
} as const;

export function BrandFonts() {
  return <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" />;
}

/** The roofline mark: a roof that doubles as a launch arrow, over one line (the listing). */
export function Mark({ size = 36, reversed = false }: { size?: number; reversed?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect width="48" height="48" rx="3" fill={reversed ? BRAND.ivory : BRAND.evergreen} />
      <path d="M12 26 L24 14 L36 26" fill="none" stroke={BRAND.brass} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 35 H33" stroke={reversed ? BRAND.evergreen : BRAND.ivory} strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

/** Always lowercase, always ending in the brass period. */
export function Wordmark({ size = 24, reversed = false }: { size?: number; reversed?: boolean }) {
  return (
    <span style={{ fontFamily: BRAND.serif, fontSize: size, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1, color: reversed ? BRAND.ivory : BRAND.evergreen }}>
      launch<span style={{ fontWeight: 400, fontStyle: "italic", color: reversed ? BRAND.sage : BRAND.taupe }}>&amp;</span>list<span style={{ color: BRAND.brass }}>.</span>
    </span>
  );
}

export function Logo({ size = 24, reversed = false }: { size?: number; reversed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Launch and List">
      <Mark size={Math.round(size * 1.5)} reversed={reversed} />
      <Wordmark size={size} reversed={reversed} />
    </span>
  );
}
