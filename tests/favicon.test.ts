import { test } from "node:test";
import assert from "node:assert/strict";
import { markBounds } from "../lib/favicon";
import { initials } from "../lib/siteIcon";

/** A transparent canvas with opaque rectangles painted on it. */
function paint(w: number, h: number, rects: [number, number, number, number][]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (const [x0, y0, rw, rh] of rects) for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) d.set([20, 40, 80, 255], (y * w + x) * 4);
  return d;
}

test("a symbol beside a name: the icon uses just the symbol", () => {
  // 100×100 symbol, a gap, then "letters" filling the rest of the line.
  const rects: [number, number, number, number][] = [[10, 10, 100, 100]];
  for (let i = 0; i < 8; i++) rects.push([140 + i * 45, 40, 35, 40]);
  assert.deepEqual(markBounds(paint(520, 120, rects), 520, 120), { x: 10, y: 10, w: 100, h: 100 });
});

test("a symbol above a name: the icon uses just the symbol", () => {
  const d = paint(300, 260, [[100, 10, 100, 100], [20, 160, 260, 40]]);
  assert.deepEqual(markBounds(d, 300, 260), { x: 100, y: 10, w: 100, h: 100 });
});

test("a name with no symbol, or a plain square mark, uses the whole logo", () => {
  assert.deepEqual(markBounds(paint(200, 200, [[20, 20, 160, 160]]), 200, 200), { x: 20, y: 20, w: 160, h: 160 });
  // One long word, no gaps: nothing to split off.
  assert.deepEqual(markBounds(paint(500, 80, [[10, 20, 480, 40]]), 500, 80), { x: 10, y: 20, w: 480, h: 40 });
  assert.equal(markBounds(paint(50, 50, []), 50, 50), null);
});

test("initials for the fallback icon", () => {
  assert.equal(initials("Jane Doe"), "JD");
  assert.equal(initials("Mary Anne de la Cruz"), "MC");
  assert.equal(initials("Casa & Co."), "CC");
  assert.equal(initials("Northline"), "NO");
  assert.equal(initials(""), "•");
});
