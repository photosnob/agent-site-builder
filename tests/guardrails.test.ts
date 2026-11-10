import { test } from "node:test";
import assert from "node:assert/strict";
import { lintClaims, lintFairHousing } from "../lib/guardrails/fairHousing";
import { applyEditPlan, type GuardContext } from "../lib/guardrails/ops";
import type { SiteContent } from "../lib/blocks/schema";

const content: SiteContent = {
  blocks: [
    { type: "hero", id: "hero-aaaa", props: { headline: "Homes in Willow Glen", subheadline: "Helping buyers and sellers.", ctaLabel: "Talk", ctaTarget: "contact" } },
    { type: "about", id: "about-bbbb", props: { headline: "Meet Theresa", body: "I love mid-century homes." } },
    { type: "stats", id: "stats-cccc", props: { items: [{ value: "12", label: "Years of experience" }] } },
    { type: "contact", id: "contact-dddd", props: { headline: "Get in touch", body: "Say hi.", showPhone: true } },
  ],
};

const ctx: GuardContext = {
  content,
  theme: { palette: "teak", fonts: "geometric", radius: "round", heroStyle: "centered", look: "classic" },
  allowedPalettes: ["teak", "atomic", "forest", "ink"],
  assets: [{ id: "a1", kind: "headshot", url: "https://x.supabase.co/storage/v1/object/public/site-assets/s/1.jpg", meta: {} }],
  knownFacts: "Theresa Lee\n12 years\nWillow Glen",
};

test("fair housing blocks exclusionary and steering language", () => {
  assert.equal(lintFairHousing("Located in a quiet Christian community")[0].severity, "block");
  assert.equal(lintFairHousing("No children please")[0].severity, "block");
  assert.equal(lintFairHousing("Perfect for young families")[0].severity, "warn");
  assert.equal(lintFairHousing("Atrium Eichler with post-and-beam ceilings").length, 0);
});

test("claims not in the agent's facts are flagged", () => {
  assert.ok(lintClaims("#1 agent in Willow Glen", "").length > 0);
  assert.equal(lintClaims("12 years of experience", "12 years").length, 0);
});

test("valid text edit applies", () => {
  const r = applyEditPlan({ summary: "", ops: [{ op: "set_text", blockId: "hero-aaaa", path: "headline", value: "Eichler homes in Willow Glen" }] }, ctx);
  assert.equal(r.ok, true);
  assert.equal(r.content.blocks[0].type === "hero" && r.content.blocks[0].props.headline, "Eichler homes in Willow Glen");
});

test("markup is rejected by the schema", () => {
  const r = applyEditPlan({ summary: "", ops: [{ op: "set_text", blockId: "hero-aaaa", path: "headline", value: "<script>alert(1)</script>" }] }, ctx);
  assert.equal(r.ok, false);
});

test("required sections cannot be removed and hero stays first", () => {
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "remove_block", blockId: "contact-dddd" }] }, ctx).ok, false);
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "move_block", blockId: "hero-aaaa", afterBlockId: "about-bbbb" }] }, ctx).ok, false);
});

test("image fields can't be set as text and stats must be grounded", () => {
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "set_text", blockId: "about-bbbb", path: "image", value: "https://evil.example/x.jpg" }] }, ctx).ok, false);
  const r = applyEditPlan({ summary: "", ops: [{ op: "set_list_item", blockId: "stats-cccc", index: 0, item: { value: "$500M", label: "Sold" } }] }, ctx);
  assert.equal(r.ok, false);
});

test("theme changes are limited to the template's palettes", () => {
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "set_theme", palette: "atomic" }] }, ctx).ok, true);
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "set_theme", palette: "champagne" }] }, ctx).ok, false);
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "set_theme", palette: "#ff00ff" }] }, ctx).ok, false);
});

test("Fair Housing violations block an edit", () => {
  const r = applyEditPlan({ summary: "", ops: [{ op: "set_text", blockId: "about-bbbb", path: "body", value: "Adults only building." }] }, ctx);
  assert.equal(r.ok, false);
});

test("About photo size can be set to a preset only", () => {
  const r = applyEditPlan({ summary: "", ops: [{ op: "set_image_size", blockId: "about-bbbb", size: "small" }] }, ctx);
  assert.equal(r.ok, true);
  const about = r.content.blocks.find((b) => b.type === "about");
  assert.equal(about?.type === "about" && about.props.imageSize, "small");
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "set_image_size", blockId: "hero-aaaa", size: "small" }] }, ctx).ok, false);
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "set_text", blockId: "about-bbbb", path: "imageSize", value: "tiny" }] }, ctx).ok, false);
});

test("inner pages: header stays first, no heroes, contact optional", async () => {
  const { buildPage, _test } = await import("../lib/pages/defaults");
  const page = buildPage("team", _test.defaultCopy({ name: "Pete Peterson" }), { name: "Pete Peterson" });
  const pctx = { ...ctx, content: page, kind: "page" as const };
  const contactId = page.blocks.find((b) => b.type === "contact")!.id;
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "remove_block", blockId: contactId }] }, pctx).ok, true);
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "remove_block", blockId: page.blocks[0].id }] }, pctx).ok, false);
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "add_block", type: "hero", afterBlockId: page.blocks[0].id, props: {} }] }, pctx).ok, false);
  const ok = applyEditPlan({ summary: "", ops: [{ op: "add_block", type: "faq", afterBlockId: page.blocks[1].id, props: { headline: "Questions", items: [{ q: "Do you work weekends?", a: "Yes." }] } }] }, pctx);
  assert.equal(ok.ok, true);
  // And the home page rejects page headers.
  assert.equal(applyEditPlan({ summary: "", ops: [{ op: "add_block", type: "page-header", afterBlockId: "hero-aaaa", props: { headline: "x" } }] }, ctx).ok, false);
});
