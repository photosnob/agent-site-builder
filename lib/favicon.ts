/**
 * Site icons (favicons) for agents' websites. By default the icon is made from
 * the agent's logo: if the logo is a symbol beside (or above) a name, just the
 * symbol is used, since a name is unreadable at 16px. Agents can upload their
 * own icon instead. The pixel work runs in the browser; the helpers that only
 * look at pixels are pure so they can be tested.
 */
export type Box = { x: number; y: number; w: number; h: number };

export const ICON_SIZE = 256;

/** Which pixels are part of the logo: opaque pixels, or ones unlike the corner color when there's no transparency. */
function inkMask(d: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const m = new Uint8Array(w * h);
  const opaqueCorner = d[3] > 200;
  const [br, bg, bb] = [d[0], d[1], d[2]];
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (d[i + 3] < 48) continue;
    if (opaqueCorner && Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) < 60) continue;
    m[p] = 1;
  }
  return m;
}

function bounds(m: Uint8Array, w: number, x0: number, y0: number, x1: number, y1: number): Box | null {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (!m[y * w + x]) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Runs of filled positions along one axis, split where there's a gap of at least `gap` empty positions. */
function runs(filled: boolean[], gap: number): [number, number][] {
  const out: [number, number][] = [];
  let start = -1, lastFilled = -1;
  filled.forEach((f, i) => {
    if (!f) return;
    if (start < 0) start = i;
    else if (i - lastFilled > gap) { out.push([start, lastFilled]); start = i; }
    lastFilled = i;
  });
  if (start >= 0) out.push([start, lastFilled]);
  return out;
}

/**
 * The part of a logo to use as its icon. For a wide logo with a symbol on the
 * left, or a tall one with a symbol on top, that's the symbol; otherwise the
 * whole logo.
 */
export function markBounds(d: Uint8ClampedArray, w: number, h: number): Box | null {
  const m = inkMask(d, w, h);
  const all = bounds(m, w, 0, 0, w, h);
  if (!all) return null;
  const sq = (b: Box) => b.w / b.h;

  if (sq(all) > 1.4) {
    const cols = Array.from({ length: all.w }, (_, i) => { for (let y = all.y; y < all.y + all.h; y++) if (m[y * w + all.x + i]) return true; return false; });
    const [first, ...rest] = runs(cols, Math.max(3, Math.round(all.h * 0.12)));
    if (first && rest.length) {
      const b = bounds(m, w, all.x + first[0], all.y, all.x + first[1] + 1, all.y + all.h);
      if (b && b.w <= all.w * 0.45 && b.h >= all.h * 0.6 && sq(b) > 0.5 && sq(b) < 1.8) return b;
    }
  } else {
    const rowsFilled = Array.from({ length: all.h }, (_, i) => { for (let x = all.x; x < all.x + all.w; x++) if (m[(all.y + i) * w + x]) return true; return false; });
    const [first, ...rest] = runs(rowsFilled, Math.max(3, Math.round(all.w * 0.04)));
    if (first && rest.length) {
      const b = bounds(m, w, all.x, all.y + first[0], all.x + all.w, all.y + first[1] + 1);
      if (b && b.h <= all.h * 0.7 && sq(b) > 0.5 && sq(b) < 2) return b;
    }
  }
  return all;
}

/** Average brightness (0–1) and how much of the box is filled, for picking a backdrop. */
export function markStats(d: Uint8ClampedArray, w: number, b: Box): { luminance: number; fill: number } {
  let sum = 0, n = 0;
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 128) continue;
    sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; n++;
  }
  return { luminance: n ? sum / n : 0, fill: n / (b.w * b.h) };
}

// ---------------------------------------------------------------- browser only

async function loadImage(src: Blob | string): Promise<HTMLImageElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  try { await img.decode(); } finally { if (typeof src !== "string") URL.revokeObjectURL(url); }
  return img;
}

function toPng(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't make the icon"))), "image/png"));
}

/**
 * A square PNG icon from a logo. Solid square marks fill the icon; anything else
 * sits on a rounded tile (white behind dark marks, near-black behind light ones)
 * so it stays visible in both light and dark browser tabs.
 */
export async function iconFromLogo(src: Blob | string): Promise<Blob> {
  const img = await loadImage(src);
  const scale = Math.min(1, 1000 / img.naturalWidth, 1000 / img.naturalHeight);
  const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
  const work = document.createElement("canvas");
  work.width = w; work.height = h;
  const wctx = work.getContext("2d")!;
  wctx.drawImage(img, 0, 0, w, h);
  const d = wctx.getImageData(0, 0, w, h).data;
  const b = markBounds(d, w, h) ?? { x: 0, y: 0, w, h };
  const { luminance, fill } = markStats(d, w, b);

  const out = document.createElement("canvas");
  out.width = out.height = ICON_SIZE;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const solidSquare = fill > 0.85 && b.w / b.h > 0.85 && b.w / b.h < 1.18;
  let pad = 0;
  if (!solidSquare) {
    ctx.fillStyle = luminance > 0.6 ? "#1c1917" : "#ffffff";
    ctx.beginPath();
    ctx.roundRect(0, 0, ICON_SIZE, ICON_SIZE, ICON_SIZE * 0.22);
    ctx.fill();
    pad = ICON_SIZE * 0.14;
  }
  const room = ICON_SIZE - pad * 2;
  const k = Math.min(room / b.w, room / b.h);
  const dw = b.w * k, dh = b.h * k;
  ctx.drawImage(work, b.x, b.y, b.w, b.h, (ICON_SIZE - dw) / 2, (ICON_SIZE - dh) / 2, dw, dh);
  return toPng(out);
}

/** A square PNG icon from an uploaded image: the centered square, scaled to the icon size. */
export async function iconFromUpload(file: Blob): Promise<Blob> {
  const img = await loadImage(file);
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  const out = document.createElement("canvas");
  out.width = out.height = ICON_SIZE;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, ICON_SIZE, ICON_SIZE);
  return toPng(out);
}
