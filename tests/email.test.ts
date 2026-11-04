import { test } from "node:test";
import assert from "node:assert/strict";
import { leadEmail } from "../lib/email";

test("lead email escapes what the visitor typed and links to the right page", () => {
  const m = leadEmail(
    { name: "Ana <script>", email: "ana@example.com", phone: "(520) 555-0100", message: "Hi <b>there</b>\nSecond line", intent: "valuation", pagePath: "/s/pete/blog/adu" },
    { siteUrl: "https://pete.example.com", dashboardUrl: "https://app.example.com/dashboard" },
  );
  assert.equal(m.subject, "Home valuation request: Ana <script>"); // subject is plain text
  assert.ok(!m.html.includes("<script>") && m.html.includes("Ana &lt;script&gt;"));
  assert.ok(m.html.includes("Hi &lt;b&gt;there&lt;/b&gt;"));
  assert.ok(m.html.includes('href="tel:5205550100"'));
  assert.ok(m.text.includes("From page: https://pete.example.com/blog/adu"));
});
