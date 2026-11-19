import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeHero, encodeHero, heroMediaError, type HeroSettings } from "../lib/hero";

const OWN = "https://x.supabase.co/storage/v1/object/public/site-assets/site-1/";
const STOCK = "https://x.supabase.co/storage/v1/object/public/site-assets/stock/";

test("unsaved hero settings survive the trip through the preview URL", () => {
  const h: HeroSettings = { heroStyle: "full-bleed", image: `${OWN}kitchen.jpg`, videoUrl: null, videoSpeed: 1, slides: [], secondaryCtaLabel: "Café tour", secondaryCtaTarget: "listings" };
  const enc = encodeHero(h);
  assert.match(enc, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeHero(enc), h);
});

test("bad or tampered preview settings are ignored", () => {
  assert.equal(decodeHero("not-base64!!"), null);
  assert.equal(decodeHero(encodeHero({ heroStyle: "nope" } as unknown as HeroSettings)), null);
});

test("preview only shows media the agent could save", () => {
  assert.equal(heroMediaError({ heroStyle: "full-bleed", image: `${OWN}a.jpg` }, OWN, STOCK), null);
  assert.ok(heroMediaError({ heroStyle: "full-bleed", image: "https://evil.example/a.jpg" }, OWN, STOCK));
  assert.equal(heroMediaError({ heroStyle: "video", videoUrl: `${STOCK}waves.mp4` }, OWN, STOCK), null);
  assert.ok(heroMediaError({ heroStyle: "slideshow", slides: [`${OWN}a.jpg`, `${STOCK}b.jpg`] }, OWN, STOCK));
});
