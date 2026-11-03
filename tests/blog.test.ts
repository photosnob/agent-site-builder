import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildToc, plainText, readingMinutes, validatePostDoc } from "../lib/blog/content";
import { PostBody } from "../components/blog/PostBody";

const PREFIX = "https://x.supabase.co/storage/v1/object/public/site-assets/site-1/";

const doc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Intro with a " }, { type: "text", text: "link", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Why Eichlers?" }] },
    { type: "paragraph", content: [{ type: "text", text: "Post-and-beam ceilings.", marks: [{ type: "bold" }] }] },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Atriums" }] },
    { type: "figure", attrs: { src: `${PREFIX}a.jpg`, alt: "An atrium", size: "medium" }, content: [{ type: "text", text: "Original atrium" }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Why Eichlers?" }] },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Radiant heat" }] }] }] },
  ],
};

test("valid post passes and builds a de-duplicated TOC", () => {
  const v = validatePostDoc(doc, PREFIX);
  assert.equal(v.ok, true);
  assert.deepEqual(buildToc(doc).map((t) => [t.id, t.level]), [["why-eichlers", 2], ["atriums", 3], ["why-eichlers-2", 2]]);
  assert.ok(plainText(doc).includes("Original atrium"));
  assert.equal(readingMinutes(doc), 1);
});

test("rejects H1 in the body, unknown nodes, script links and outside images", () => {
  const withH1 = { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "x" }] }] };
  assert.equal(validatePostDoc(withH1, PREFIX).ok, false);
  const html = { type: "doc", content: [{ type: "htmlBlock", attrs: { html: "<script>" } }] };
  assert.equal(validatePostDoc(html, PREFIX).ok, false);
  const js = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] };
  assert.equal(validatePostDoc(js, PREFIX).ok, false);
  const hotlink = { type: "doc", content: [{ type: "figure", attrs: { src: "https://other.com/a.jpg" } }] };
  assert.equal(validatePostDoc(hotlink, PREFIX).ok, false);
  const otherSite = { type: "doc", content: [{ type: "figure", attrs: { src: PREFIX.replace("site-1", "site-2") + "a.jpg" } }] };
  assert.equal(validatePostDoc(otherSite, PREFIX).ok, false);
});

test("renderer outputs heading ids that match the TOC, figures and safe links", () => {
  const html = renderToStaticMarkup(createElement(PostBody, { doc }));
  assert.ok(html.includes('<h2 id="why-eichlers">'));
  assert.ok(html.includes('<h2 id="why-eichlers-2">'));
  assert.ok(html.includes('<h3 id="atriums">'));
  assert.ok(html.includes('data-size="medium"'));
  assert.ok(html.includes("<figcaption>Original atrium</figcaption>"));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes("<strong>Post-and-beam ceilings.</strong>"));
});
