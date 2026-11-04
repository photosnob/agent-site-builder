import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, contentBounds, removeBackground } from "../lib/logo";

/** 40x20 white image with a dark "O": a ring with a white hole in the middle. */
function ringOnWhite() {
  const w = 40, h = 20, d = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = Math.hypot(x - 20, y - 10);
    if (r >= 4 && r <= 7) { const i = (y * w + x) * 4; d[i] = 20; d[i + 1] = 40; d[i + 2] = 90; }
  }
  return { d, w, h };
}
const alphaAt = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4 + 3];

test("detects a uniform white background", () => {
  const { d, w, h } = ringOnWhite();
  const a = analyze(d, w, h);
  assert.equal(a.hasTransparency, false);
  assert.deepEqual(a.background, [255, 255, 255]);
});

test("connected mode keeps the hole inside the letter; 'all' clears it", () => {
  const { d, w, h } = ringOnWhite();
  const c = removeBackground(d, w, h, [255, 255, 255], "connected");
  assert.equal(alphaAt(c, w, 0, 0), 0);      // corner background removed
  assert.equal(alphaAt(c, w, 20, 10), 255);  // hole kept
  assert.equal(alphaAt(c, w, 26, 10), 255);  // ring kept
  const all = removeBackground(d, w, h, [255, 255, 255], "all");
  assert.equal(alphaAt(all, w, 20, 10), 0);
  const b = contentBounds(c, w, h, 0);
  assert.ok(b.w <= 16 && b.h <= 16);         // trimmed to the ring
});

test("busy backgrounds and transparent images are left alone", () => {
  const w = 30, h = 30, noisy = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < noisy.length; i += 4) { noisy[i] = (i * 37) % 256; noisy[i + 1] = (i * 91) % 256; noisy[i + 2] = (i * 13) % 256; noisy[i + 3] = 255; }
  assert.equal(analyze(noisy, w, h).background, null);
  const clear = new Uint8ClampedArray(w * h * 4);
  assert.equal(analyze(clear, w, h).hasTransparency, true);
});
