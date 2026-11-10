import { PALETTES } from "@/lib/blocks/theme";
import type { Template } from "@/lib/templates";

/**
 * A small layout sketch of a template, drawn in its own palette. Scales to any
 * size (it's an SVG), so it works in the onboarding picker and on the homepage.
 */
export function TemplateThumb({ t, tall = false }: { t: Template; tall?: boolean }) {
  const p = PALETTES[t.theme.palette];
  const id = `tt-${t.id}`;
  const H = tall ? 250 : 160;
  const photo = (x: number, y: number, w: number, h: number, r = 0, tone: "day" | "dusk" = "day") => (
    <rect x={x} y={y} width={w} height={h} rx={r} fill={`url(#${id}-${tone})`} />
  );
  const line = (x: number, y: number, w: number, h: number, fill: string, r = 1) => <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />;
  const look = t.theme.look ?? "classic";
  const below = H - 160; // extra room in the tall version, used for a row of cards

  let body: React.ReactNode;
  if (look === "noir") {
    body = (
      <>
        <rect width="200" height={H} fill={p.bg} />
        {photo(0, 0, 200, 110, 0, "dusk")}
        <rect width="200" height="110" fill="#000" opacity="0.35" />
        {line(80, 9, 40, 2.5, p.text)}
        {line(14, 62, 22, 2, p.accent)}
        {line(14, 70, 120, 8, p.text)}
        {line(14, 82, 86, 8, p.text)}
        {line(14, 96, 26, 7, "#fff", 0)}{line(44, 96, 26, 7, "none", 0)}<rect x="44" y="96" width="26" height="7" fill="none" stroke="#fff" strokeWidth="0.6" />
        {line(14, 122, 60, 5, p.text)}
        {photo(14, 134, 76, 50 + below * 0.6)}{photo(96, 134, 76, 50 + below * 0.6)}{photo(178, 134, 40, 50 + below * 0.6)}
      </>
    );
  } else if (look === "riviera") {
    body = (
      <>
        <rect width="200" height={H} fill={p.bg} />
        {photo(0, 0, 200, 96, 0, "dusk")}
        <rect width="200" height="96" fill="#000" opacity="0.4" />
        {line(10, 9, 14, 2, "#fff")}{line(84, 8, 32, 3, "#fff")}{line(176, 9, 14, 2, "#fff")}
        {line(36, 38, 128, 11, "#fff")}{line(60, 54, 80, 11, "#fff")}
        {line(84, 74, 32, 6, "none")}<rect x="82" y="74" width="36" height="7" fill="none" stroke="#fff" strokeWidth="0.6" />
        {line(70, 108, 60, 6, p.text)}{line(99.5, 118, 1, 10, p.muted)}
        {photo(20, 136, 76, 46 + below * 0.6)}{photo(104, 136, 76, 46 + below * 0.6)}
        {line(20, 188 + below * 0.6, 60, 4, p.text)}{line(104, 188 + below * 0.6, 54, 4, p.text)}
      </>
    );
  } else if (look === "bright") {
    body = (
      <>
        <rect width="200" height={H} fill={p.bg} />
        {line(12, 9, 30, 4, p.text)}{line(164, 7, 24, 8, p.accent, 4)}
        {line(30, 30, 140, 13, p.text, 2)}{line(52, 47, 96, 13, p.text, 2)}
        {line(60, 66, 80, 4, p.muted)}
        {line(82, 76, 36, 10, p.accent, 5)}
        {photo(12, 94, 176, 58 + below * 0.9, 10)}
      </>
    );
  } else if (t.theme.heroStyle === "split") {
    body = (
      <>
        <rect width="200" height={H} fill={p.bg} />
        {line(12, 9, 34, 4, p.text)}{line(168, 7, 20, 8, p.accent, 3)}
        {line(12, 40, 22, 3, p.accent)}{line(12, 48, 82, 8, p.text)}{line(12, 60, 64, 8, p.text)}
        {line(12, 74, 72, 3, p.muted)}{line(12, 80, 60, 3, p.muted)}{line(12, 92, 34, 9, p.accent, 3)}
        {photo(110, 28, 78, 90, 6)}
        <rect x="0" y="128" width="200" height={H - 128} fill={p.surface} />
        {photo(12, 138, 54, 36 + below * 0.6, 4)}{photo(73, 138, 54, 36 + below * 0.6, 4)}{photo(134, 138, 54, 36 + below * 0.6, 4)}
      </>
    );
  } else if (t.theme.heroStyle === "centered") {
    body = (
      <>
        <rect width="200" height={H} fill={p.bg} />
        {line(12, 9, 34, 4, p.text)}{line(168, 7, 20, 8, p.accent, 4)}
        <circle cx="100" cy="42" r="16" fill={`url(#${id}-day)`} />
        {line(46, 66, 108, 9, p.text, 2)}{line(64, 80, 72, 4, p.muted)}{line(82, 90, 36, 9, p.accent, 4.5)}
        {[12, 73, 134].map((x) => <rect key={x} x={x} y="114" width="54" height={34 + below * 0.7} rx="8" fill={p.surface} />)}
        {[12, 73, 134].map((x) => <rect key={x} x={x + 6} y="122" width="30" height="4" rx="1" fill={p.text} />)}
      </>
    );
  } else {
    body = (
      <>
        <rect width="200" height={H} fill={p.bg} />
        {photo(0, 0, 200, 112, 0, "dusk")}
        <rect width="200" height="112" fill="#000" opacity="0.3" />
        {line(12, 9, 34, 4, "#fff")}
        {line(12, 74, 110, 9, "#fff")}{line(12, 88, 70, 4, "#fff")}{line(12, 97, 32, 8, p.accent)}
        {photo(12, 124, 84, 40 + below * 0.7)}{photo(104, 124, 84, 40 + below * 0.7)}
      </>
    );
  }

  return (
    <svg viewBox={`0 0 200 ${H}`} className="block h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-day`} x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stopColor="#b9cfe0" /><stop offset="0.6" stopColor="#e9dcc8" /><stop offset="1" stopColor="#8f9a7c" /></linearGradient>
        <linearGradient id={`${id}-dusk`} x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stopColor="#1f2a3c" /><stop offset="0.55" stopColor="#8a6a5c" /><stop offset="1" stopColor="#2b2e2a" /></linearGradient>
      </defs>
      {body}
    </svg>
  );
}
