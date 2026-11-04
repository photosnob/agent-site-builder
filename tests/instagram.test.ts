import { test } from "node:test";
import assert from "node:assert/strict";
process.env.TOKEN_ENCRYPTION_KEY = "test-key";
process.env.INSTAGRAM_APP_ID = "123";
process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

test("tokens round-trip through encryption and tampering is detected", async () => {
  const { encrypt, decrypt } = await import("../lib/crypto");
  const c = encrypt("IGAAtoken");
  assert.notEqual(c, "IGAAtoken");
  assert.equal(decrypt(c), "IGAAtoken");
  const parts = c.split(".");
  parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("A") ? "BB" : "AA");
  assert.throws(() => decrypt(parts.join(".")));
});

test("OAuth state is signed and expires", async () => {
  const { sign, verify } = await import("../lib/crypto");
  const s = sign("site-1:user-1", 60);
  assert.equal(verify(s), "site-1:user-1");
  assert.equal(verify(s.replace("site-1", "site-2")), null);
  assert.equal(verify(sign("x", -1)), null);
});

test("authorize URL asks only for basic profile and media access", async () => {
  const { _test } = await import("../lib/instagram");
  const u = new URL(_test.authorizeUrl("state123"));
  assert.equal(u.origin + u.pathname, "https://www.instagram.com/oauth/authorize");
  assert.equal(u.searchParams.get("scope"), "instagram_business_basic");
  assert.equal(u.searchParams.get("redirect_uri"), "https://app.example.com/api/instagram/callback");
  assert.equal(u.searchParams.get("state"), "state123");
});
