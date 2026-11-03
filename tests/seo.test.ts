import { test } from "node:test";
import assert from "node:assert/strict";
import { agentJsonLd, defaultTitle, llmsTxt, robotsTxt, rssXml, sitemapXml, type SeoPost, type SeoSite } from "../lib/seo/files";
import { SiteSeo, cleanPlainText, extractVerificationCode } from "../lib/seo/schema";

const site: SeoSite = {
  slug: "theresa-lee",
  origin: "https://theresa-lee.porchlight.homes",
  agent: { name: "Theresa Lee", brokerage: "Compass", licenseNumber: "01234567", licenseState: "CA", serviceAreas: ["Willow Glen", "Palo Alto"], specialties: ["Mid-century / architectural"], email: "t@example.com" },
  content: { blocks: [
    { type: "hero", id: "hero-aaaa", props: { headline: "Eichler homes", subheadline: "Helping buyers and sellers of mid-century homes.", ctaLabel: "Talk", ctaTarget: "contact" } },
    { type: "contact", id: "contact-bbbb", props: { headline: "Hi", body: "Say hi", showPhone: false } },
  ] },
  seo: {},
  publishedAt: "2026-11-01T10:00:00Z",
};
const posts: SeoPost[] = [
  { slug: "adu-costs", title: "ADU costs in Lafayette & more", excerpt: "What to budget", meta_description: null, published_at: "2026-11-02T10:00:00Z", updated_at: "2026-11-03T10:00:00Z" },
];

test("sitemap lists home, blog and posts with escaped URLs", () => {
  const x = sitemapXml(site, posts);
  assert.ok(x.includes("<loc>https://theresa-lee.porchlight.homes</loc>"));
  assert.ok(x.includes("<loc>https://theresa-lee.porchlight.homes/blog</loc><lastmod>2026-11-03T10:00:00.000Z</lastmod>"));
  assert.ok(x.includes("/blog/adu-costs</loc>"));
  assert.equal((x.match(/<url>/g) ?? []).length, 3);
  assert.equal((sitemapXml({ ...site, seo: { noindex: true } }, posts).match(/<url>/g) ?? []).length, 0);
});

test("robots points to the sitemap, or blocks everything when hidden", () => {
  assert.ok(robotsTxt(site).includes("Sitemap: https://theresa-lee.porchlight.homes/sitemap.xml"));
  assert.ok(robotsTxt({ ...site, seo: { noindex: true } }).includes("Disallow: /"));
});

test("llms.txt is generated from the profile, or uses the custom file", () => {
  const t = llmsTxt(site, posts);
  assert.ok(t.startsWith("# Theresa Lee\n\n> Helping buyers"));
  assert.ok(t.includes("- Areas served: Willow Glen, Palo Alto"));
  assert.ok(t.includes("- License: CA #01234567"));
  assert.ok(t.includes("[ADU costs in Lafayette & more](https://theresa-lee.porchlight.homes/blog/adu-costs): What to budget"));
  assert.equal(llmsTxt({ ...site, seo: { llmsTxt: "# Custom\n" } }, posts), "# Custom\n");
});

test("RSS escapes titles and JSON-LD describes the agent", () => {
  assert.ok(rssXml(site, posts).includes("<title>ADU costs in Lafayette &amp; more</title>"));
  const ld = agentJsonLd(site, "https://img/x.jpg");
  assert.equal(ld["@type"], "RealEstateAgent");
  assert.deepEqual(ld.areaServed?.map((a) => a.name), ["Willow Glen", "Palo Alto"]);
  assert.equal(defaultTitle(site.agent), "Theresa Lee | Compass");
});

test("settings input is cleaned and validated", () => {
  assert.equal(extractVerificationCode('<meta name="google-site-verification" content="abc_123-XYZ" />'), "abc_123-XYZ");
  assert.equal(SiteSeo.safeParse({ googleVerification: "bad code!" }).success, false);
  assert.equal(cleanPlainText("a\r\nb\u0000c"), "a\nbc");
});
