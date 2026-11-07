import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePath, normalizeTarget, suggestTarget, destinations, parseSitemap, parseBulk, isSkippablePath } from "../lib/redirects";

test("normalizes old URLs", () => {
  assert.equal(normalizePath("https://old.com/About-Us/?ref=x#top"), "/about-us");
  assert.equal(normalizePath("/blog/my-post/"), "/blog/my-post");
  assert.equal(normalizePath("contact"), "/contact");
  assert.equal(normalizePath("/caf%C3%A9"), "/café");
  assert.equal(normalizePath("https://old.com/"), null);
  assert.equal(normalizePath(""), null);
});

test("validates targets", () => {
  assert.equal(normalizeTarget("buy"), "/buy");
  assert.equal(normalizeTarget("#contact"), "/#contact");
  assert.equal(normalizeTarget("https://zillow.com/profile/x"), "https://zillow.com/profile/x");
  assert.equal(normalizeTarget("//evil.com"), null);
  assert.equal(normalizeTarget("javascript:alert(1)"), "/javascript:alert(1)"); // becomes a harmless relative path
});

const dests = destinations(
  [{ slug: "buy", title: "Buy", kind: "buy" }, { slug: "sell", title: "Sell", kind: "sell" }, { slug: "team", title: "Meet the Team", kind: "team" }, { slug: "success-stories", title: "Success Stories", kind: "reviews" }],
  [{ slug: "tucson-market-update-2024", title: "Tucson market update" }, { slug: "best-neighborhoods-in-tucson", title: "Best neighborhoods" }],
);

test("suggests sensible targets", () => {
  const s = (p: string) => suggestTarget(p, dests);
  assert.deepEqual(s("/about-me"), { to: "/#about", confident: true });
  assert.equal(s("/testimonials").to, "/success-stories");
  assert.equal(s("/buyers").to, "/buy");
  assert.equal(s("/sellers-guide").to, "/sell");
  assert.equal(s("/whats-my-home-worth").to, "/#contact?intent=valuation");
  assert.equal(s("/contact-us").to, "/#contact");
  assert.equal(s("/featured-listings").to, "/#listings");
  assert.equal(s("/2024/03/tucson-market-update-2024").to, "/blog/tucson-market-update-2024");
  assert.equal(s("/blog/the-best-neighborhoods-in-tucson-az").to, "/blog/best-neighborhoods-in-tucson");
  assert.deepEqual(s("/blog/some-old-post"), { to: "/blog", confident: false });
  assert.deepEqual(s("/random-page"), { to: "/", confident: false });
});

test("skips files and CMS internals", () => {
  for (const p of ["/wp-content/uploads/a.jpg", "/feed", "/blog/feed", "/sitemap.xml", "/wp-json/x"]) assert.ok(isSkippablePath(p), p);
  assert.ok(!isSkippablePath("/about"));
});

test("parses sitemaps and bulk lists", () => {
  assert.deepEqual(parseSitemap("<urlset><url><loc>https://a.com/x</loc></url><url><loc><![CDATA[https://a.com/y?a=1&amp;b=2]]></loc></url></urlset>").pages, ["https://a.com/x", "https://a.com/y?a=1&b=2"]);
  assert.deepEqual(parseSitemap("<sitemapindex><sitemap><loc>https://a.com/post-sitemap.xml</loc></sitemap></sitemapindex>").sitemaps, ["https://a.com/post-sitemap.xml"]);
  assert.deepEqual(parseBulk("/old-a → /buy\n/old-b,/sell\n# comment\n/old-c /blog\n/lonely"), [{ from: "/old-a", to: "/buy" }, { from: "/old-b", to: "/sell" }, { from: "/old-c", to: "/blog" }]);
});
