import { test } from "node:test";
import assert from "node:assert/strict";
import { SiteTracking, extractTrackerId } from "../lib/tracking";

test("pulls IDs out of pasted snippets", () => {
  assert.equal(extractTrackerId("gtm", `<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-KB6GP84D"></script>`), "GTM-KB6GP84D");
  assert.equal(extractTrackerId("ga4", "gtag('config', 'G-ABC123XYZ9');"), "G-ABC123XYZ9");
  assert.equal(extractTrackerId("ga4", " g-abc123xyz9 "), "G-ABC123XYZ9");
  assert.equal(extractTrackerId("googleAds", "gtag('config', 'AW-987654321');"), "AW-987654321");
  assert.equal(extractTrackerId("metaPixel", "fbq('init', '1234567890123456');"), "1234567890123456");
  assert.equal(extractTrackerId("linkedin", '_linkedin_partner_id = "5551234";'), "5551234");
});

test("rejects anything that isn't a clean ID", () => {
  assert.equal(SiteTracking.safeParse({ gtm: "GTM-KB6GP84D" }).success, true);
  for (const bad of [{ gtm: "GTM-1');alert(1)//" }, { ga4: "UA-12345-1" }, { metaPixel: "12ab" }, { googleAds: "AW-1" }]) {
    assert.equal(SiteTracking.safeParse(bad).success, false, JSON.stringify(bad));
  }
});
