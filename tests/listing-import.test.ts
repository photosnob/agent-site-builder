import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListingPage } from "../lib/import/listing";

const ld = (o: object) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

test("reads schema.org listing data", () => {
  const html = `<html><head>${ld({
    "@context": "https://schema.org", "@graph": [
      { "@type": "RealEstateAgent", name: "Pete", address: { streetAddress: "1 Office Way", addressLocality: "Tucson" }, image: "https://cdn.x.com/agent-headshot.jpg" },
      { "@type": "SingleFamilyResidence", name: "4462 E Camino Real", address: { "@type": "PostalAddress", streetAddress: "4462 E Camino Real", addressLocality: "Tucson", addressRegion: "AZ", postalCode: "85718" },
        numberOfBedrooms: 4, numberOfBathroomsTotal: 3.5, floorSize: { "@type": "QuantitativeValue", value: "3,120", unitCode: "FTK" },
        image: ["https://photos.example.com/abc/1-1536x1024.jpg", { "@type": "ImageObject", url: "https://photos.example.com/abc/2.jpg" }],
        description: "Light-filled foothills home with mountain views, a remodeled kitchen and a pool shaded by mesquite trees." },
      { "@type": "Offer", price: 1598000, priceCurrency: "USD" },
    ] })}</head><body></body></html>`;
  const r = parseListingPage(html, "https://agent.example.com/listing/1");
  assert.equal(r.draft.address, "4462 E Camino Real");
  assert.equal(r.draft.city, "Tucson, AZ 85718");
  assert.equal(r.draft.price, "$1,598,000");
  assert.equal(r.draft.beds, 4);
  assert.equal(r.draft.baths, 3.5);
  assert.equal(r.draft.sqft, 3120);
  assert.match(r.draft.description!, /foothills home/);
  assert.deepEqual(r.photos.slice(0, 2), ["https://photos.example.com/abc/1-1536x1024.jpg", "https://photos.example.com/abc/2.jpg"]);
  assert.ok(!r.photos.some((p) => p.includes("headshot")), "agent photo excluded");
});

test("finds gallery photos, collapses size variants, skips logos and maps", () => {
  const html = `<html><head><meta property="og:image" content="https://img.site.com/p/123/photo_01_640.jpg"><meta property="product:price:amount" content="725000"></head><body>
    <img src="/logo.png" width="120"><img src="https://maps.googleapis.com/maps/api/staticmap?c=1">
    <div class="photo-gallery">
      <img data-src="https://img.site.com/p/123/photo_01_1280.jpg" src="data:image/gif;base64,R0">
      <img srcset="https://img.site.com/p/123/photo_02_640.jpg 640w, https://img.site.com/p/123/photo_02_1280.jpg 1280w">
    </div>
    <script>window.__DATA__={"photos":["https:\\/\\/img.site.com\\/p\\/123\\/photo_03_1280.jpg"]}</script>
  </body></html>`;
  const r = parseListingPage(html, "https://site.com/home/123");
  assert.equal(r.draft.price, "$725,000");
  assert.deepEqual(r.photos.sort(), ["https://img.site.com/p/123/photo_01_1280.jpg", "https://img.site.com/p/123/photo_02_1280.jpg", "https://img.site.com/p/123/photo_03_1280.jpg"]);
});

test("pulls readable text for the AI step and ignores scripts", () => {
  const r = parseListingPage(`<html><head><title>2 Bed Condo | Brokerage</title></head><body><nav>Menu</nav><main><h1>212 Sentinel Peak Rd</h1><p>Sold for $640,000</p></main><script>evil()</script></body></html>`, "https://b.com/x");
  assert.match(r.text, /Title: 2 Bed Condo/);
  assert.match(r.text, /212 Sentinel Peak Rd/);
  assert.doesNotMatch(r.text, /evil|Menu/);
});
