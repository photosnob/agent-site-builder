/**
 * Logo background removal on raw RGBA pixels (works in the browser on canvas
 * data, and in tests). Designed for logos: a fairly uniform background color
 * around the edges. Photos with busy backgrounds are left alone.
 */
export type RGBA = Uint8ClampedArray;

const dist = (d: RGBA, i: number, c: [number, number, number]) =>
  Math.sqrt((d[i] - c[0]) ** 2 + (d[i + 1] - c[1]) ** 2 + (d[i + 2] - c[2]) ** 2);

export interface Analysis {
  hasTransparency: boolean;
  background: [number, number, number] | null; // null = no uniform background found
  borderUniformity: number; // share of edge pixels close to the background color
}

export function analyze(d: RGBA, w: number, h: number): Analysis {
  const edge: number[] = [];
  for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) edge.push(y * w, y * w + w - 1);
  const transparentEdge = edge.filter((p) => d[p * 4 + 3] < 200).length / edge.length;
  if (transparentEdge > 0.3) return { hasTransparency: true, background: null, borderUniformity: 0 };
  // Most common (quantized) edge color.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (const p of edge) {
    const i = p * 4;
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const bk = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bk.n++; bk.r += d[i]; bk.g += d[i + 1]; bk.b += d[i + 2];
    buckets.set(key, bk);
  }
  const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  const bg: [number, number, number] = [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)];
  const close = edge.filter((p) => dist(d, p * 4, bg) < 40).length / edge.length;
  return { hasTransparency: false, background: close >= 0.7 ? bg : null, borderUniformity: close };
}

/**
 * Makes the background transparent. "connected" removes only background that
 * touches the edges (keeps white inside letters); "all" also clears enclosed
 * areas of the same color. Edge pixels get partial alpha so curves stay smooth.
 */
export function removeBackground(src: RGBA, w: number, h: number, bg: [number, number, number], mode: "connected" | "all" = "connected", tol = 38): RGBA {
  const d = new Uint8ClampedArray(src);
  const n = w * h;
  const isBg = new Uint8Array(n);
  if (mode === "all") {
    for (let p = 0; p < n; p++) if (dist(d, p * 4, bg) < tol) isBg[p] = 1;
  } else {
    const queue = new Int32Array(n);
    let head = 0, tail = 0;
    const push = (p: number) => { if (!isBg[p] && dist(d, p * 4, bg) < tol) { isBg[p] = 1; queue[tail++] = p; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (head < tail) {
      const p = queue[head++];
      const x = p % w, y = (p / w) | 0;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }
  }
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (isBg[p]) { d[i + 3] = 0; continue; }
    // Anti-alias: pixels next to removed background, partly background-colored, become partly transparent.
    const x = p % w, y = (p / w) | 0;
    const nearBg = (x > 0 && isBg[p - 1]) || (x < w - 1 && isBg[p + 1]) || (y > 0 && isBg[p - w]) || (y < h - 1 && isBg[p + w]);
    if (!nearBg) continue;
    const dd = dist(d, i, bg);
    if (dd < tol * 2.5) {
      const a = Math.max(0.15, Math.min(1, (dd - tol * 0.5) / (tol * 2)));
      // Remove the background's tint from the remaining color.
      for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, Math.round((d[i + c] - bg[c] * (1 - a)) / a)));
      d[i + 3] = Math.round(d[i + 3] * a);
    }
  }
  return d;
}

/** Bounding box of visible pixels, with padding, for trimming empty margins. */
export function contentBounds(d: RGBA, w: number, h: number, pad = 4) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return { x: 0, y: 0, w, h };
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
