import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePage } from "../lib/import/scrape";

// Structure captured from an AgentFire agent profile page (strattonhomes.net/tucson/pete-peterson).
const html = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"RealEstateAgent","name":"Stratton Homes","logo":"https://assets.example.com/Stratton-Group-Logo.png","image":"https://assets.example.com/office.jpg"}</script>
</head><body>
<nav>Why Work With Us Meet Our Agents Communities Buyers Sellers</nav><nav>Why Work With Us Meet Our Agents</nav>
<div class="cb-image"><img class="cb-image" src="https://assets.example.com/2026/07/Boho-cozy-living-room-design-bright-wall-mockup-3d-render-3d-illustration.jpg" alt="Boho-cozy-living-room-design-bright-wall-mockup-3d-render-3d" width="1920" height="1280"></div>
<div class="aff_agent-profile-hero cbl"><div class="aff_agent-profile-hero__first-row cbl__row"><div class="cbl__row-box"><div class="cbl__column cbl__column--1">
  <div class="cbl__column-box cbl__column--column_2z4rjfaw2me">
    <div class="cbl__widget cbl__widget--profile_picture widget_47h5oj5j3uw d-inline-block">
      <img
			class="cb-image"
										src="https://assets.agentfire3.com/uploads/sites/2905/2026/10/Untitled-design-20.png"						alt="Untitled design (20)">
    </div>
    <div class="cbl__widget cbl__widget--profile_name"><h1 class="cb-title h2" aria-level=1>
					Pete Peterson
			</h1></div>
  </div>
</div></div></div></div>
<main><p>Pete Peterson is CEO &amp; Team Leader. "Estrella was wonderful at helping me find a home." - Maria G.</p></main>
<img class="ll-image" src="data:image/gif;base64,R0lGOD" data-src="https://assets.example.com/2026/07/Marana-AUTOx450.fit.jpg" alt="Marana">
<img class="ll-image" src="data:image/gif;base64,R0lGOD" data-src="/wp-content/plugins/agentfire-testimonials-v2/images/source/google-small.png" alt="Logo">
<iframe src="https://strattongroup.ruuster.com/agent/angie-kuzma/iframe?address=x"></iframe>
</body></html>`;

test("finds the headshot next to the agent's name even with a meaningless filename", () => {
  const r = parsePage(html, "https://strattonhomes.net/tucson/pete-peterson/", "Pete Peterson");
  assert.equal(r.headshots[0]?.url, "https://assets.agentfire3.com/uploads/sites/2905/2026/10/Untitled-design-20.png");
  // Stock room render and the office's JSON-LD image (not named like the agent) are not headshots.
  assert.ok(!r.headshots.some((h) => /mockup|office/.test(h.url)));
  assert.equal(r.listings.length, 0);
  assert.equal(r.idxWidget, true);
  assert.equal(r.logo, "https://assets.example.com/Stratton-Group-Logo.png");
});

test("text for AI extraction skips repeated navigation", () => {
  const r = parsePage(html, "https://strattonhomes.net/tucson/pete-peterson/", "Pete Peterson");
  assert.ok(r.text.startsWith("Pete Peterson is CEO"));
  assert.ok(!r.text.includes("Meet Our Agents"));
});

test("still finds classic listing cards", () => {
  const listingHtml = `<ul><li class="listing-card"><img src="https://x.com/photos/123-main.jpg" alt="123 Oak Street"><span>$1,250,000</span> <span>Sold</span> 123 Oak Street</li></ul>`;
  const r = parsePage(listingHtml, "https://x.com/", "Jane Doe");
  assert.equal(r.listings.length, 1);
  assert.equal(r.listings[0].price, "$1,250,000");
  assert.equal(r.listings[0].status, "sold");
});

test("logos are never headshot candidates, even without an agent name", () => {
  const html = `<script type="application/ld+json">{"@type":"RealEstateAgent","name":"Stratton Homes","image":"https://x.com/Stratton-Group-Logo-stacked-white.png"}</script>
    <div class="agent-profile"><img src="https://x.com/Stratton-Group-Logo-white.png" alt="Stratton Group logo"></div>`;
  const r = parsePage(html, "https://x.com/", "");
  assert.equal(r.headshots.length, 0);
});
