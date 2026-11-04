import { test } from "node:test";
import assert from "node:assert/strict";
import { blogIndexGraph, blogPostGraph, homeGraph, ids, type LdSite } from "../lib/seo/jsonld";
import { briefBio, normalizeSocial } from "../lib/social";

const s: LdSite = {
  origin: "https://pete.example.com",
  agent: { name: "Pete Peterson", brokerage: "Stratton Real Estate Group", serviceAreas: ["Tucson"], shortBio: "Pete leads the Stratton team.", socials: { instagram: "https://instagram.com/strattonre" } },
  content: null, seo: {}, headshot: "https://img/pete.png",
};
type Node = Record<string, unknown>;
const byType = (g: { "@graph": Node[] }, t: string) => g["@graph"].find((n) => [n["@type"]].flat().includes(t));

test("home graph links agent, person and website by @id", () => {
  const g = homeGraph(s);
  const agent = byType(g, "RealEstateAgent")!;
  assert.equal(agent["@id"], ids(s.origin).agent);
  assert.deepEqual(agent.sameAs, ["https://instagram.com/strattonre"]);
  assert.deepEqual((byType(g, "WebSite")!.publisher as Node)["@id"], ids(s.origin).agent);
  assert.equal(byType(g, "Person")!.description, "Pete leads the Stratton team.");
});

test("post graph: BlogPosting authored by the person, with breadcrumbs", () => {
  const g = blogPostGraph(s, { slug: "adu", title: "ADU costs", published_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-02T00:00:00Z", wordCount: 900, sections: ["Costs", "Permits"] });
  const post = byType(g, "BlogPosting")!;
  assert.equal((post.author as Node)["@id"], ids(s.origin).person);
  assert.equal((post.publisher as Node)["@id"], ids(s.origin).agent);
  assert.deepEqual(post.articleSection, ["Costs", "Permits"]);
  const crumbs = byType(g, "BreadcrumbList")!.itemListElement as Node[];
  assert.deepEqual(crumbs.map((c) => c.name), ["Home", "Blog", "ADU costs"]);
});

test("blog index graph is a Blog inside a CollectionPage", () => {
  const g = blogIndexGraph(s, [{ slug: "adu", title: "ADU costs", published_at: null }]);
  assert.ok(byType(g, "Blog"));
  assert.ok(byType(g, "CollectionPage"));
});

test("social links are normalized and checked against the network", () => {
  assert.deepEqual(normalizeSocial("instagram", "@strattonre"), { url: "https://instagram.com/strattonre" });
  assert.deepEqual(normalizeSocial("linkedin", "www.linkedin.com/in/pete/?trk=x"), { url: "https://www.linkedin.com/in/pete" });
  assert.ok(normalizeSocial("facebook", "https://evil.com/facebook.com").error);
  assert.ok(normalizeSocial("instagram", "instagram.com").error);
  assert.deepEqual(normalizeSocial("facebook", ""), {});
});

test("brief bio takes the first sentence or two", () => {
  assert.equal(briefBio("Pete has sold homes in Tucson for 20 years. He loves the desert. He also coaches soccer and volunteers on weekends across the city."), "Pete has sold homes in Tucson for 20 years. He loves the desert.");
});
