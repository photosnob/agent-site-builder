import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FetchBlocked, SiteRefused, fetchWithFallback } from "../lib/import/safeFetch";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; delete process.env.SCRAPINGBEE_API_KEY; });
const PUBLIC = "https://93.184.216.34/agent/"; // IP literal: no DNS needed in tests

test("blocked site falls back to the scraping service when a key is set", async () => {
  process.env.SCRAPINGBEE_API_KEY = "test-key";
  const calls: string[] = [];
  globalThis.fetch = (async (input: URL | string) => {
    const u = String(input); calls.push(u);
    if (!u.includes("scrapingbee")) return new Response("blocked", { status: 403 });
    return new Response("<html>Pete Peterson</html>", { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  const r = await fetchWithFallback(PUBLIC);
  assert.equal(r.body.toString(), "<html>Pete Peterson</html>");
  assert.equal(calls.length, 2);
  const api = new URL(calls[1]);
  assert.equal(api.searchParams.get("url"), PUBLIC);
  assert.equal(api.searchParams.get("premium_proxy"), null); // standard proxy first
});

test("without a key, a blocked site reports SiteRefused", async () => {
  globalThis.fetch = (async () => new Response("blocked", { status: 403 })) as typeof fetch;
  await assert.rejects(fetchWithFallback(PUBLIC), SiteRefused);
});

test("premium proxy is tried second; a bad key stops retries", async () => {
  process.env.SCRAPINGBEE_API_KEY = "k";
  const seen: string[] = [];
  globalThis.fetch = (async (input: URL | string) => {
    const u = String(input); seen.push(u);
    if (!u.includes("scrapingbee")) return new Response("", { status: 403 });
    return new URL(u).searchParams.get("premium_proxy") ? new Response("ok", { status: 200 }) : new Response("", { status: 500 });
  }) as typeof fetch;
  assert.equal((await fetchWithFallback(PUBLIC)).body.toString(), "ok");
  assert.equal(seen.length, 3);

  seen.length = 0;
  globalThis.fetch = (async (input: URL | string) => { seen.push(String(input)); return new Response("", { status: String(input).includes("scrapingbee") ? 401 : 403 }); }) as typeof fetch;
  await assert.rejects(fetchWithFallback(PUBLIC), SiteRefused);
  assert.equal(seen.length, 2);
});

test("private addresses are never sent to the scraping service", async () => {
  process.env.SCRAPINGBEE_API_KEY = "k";
  let called = false;
  globalThis.fetch = (async () => { called = true; return new Response("", { status: 200 }); }) as typeof fetch;
  await assert.rejects(fetchWithFallback("http://169.254.169.254/latest/meta-data/"), FetchBlocked);
  assert.equal(called, false);
});
