import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Server-side fetch for user-supplied URLs, hardened against SSRF:
 * http(s) only, standard ports, every hop's DNS checked against private and
 * metadata ranges, manual redirects, timeout and byte cap.
 * (For full DNS-rebinding protection, pin the resolved IP with a custom
 * dispatcher or run fetches from an isolated worker with no internal access.)
 */

export class FetchBlocked extends Error {}
/** The site refused us (bot protection, firewall). Not a problem with the URL. */
export class SiteRefused extends Error {}

// Many agent sites sit behind firewalls that reject unknown clients, so present
// as a normal browser. We only ever fetch pages the site owner asked us to import.
const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
};

function isPrivate(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivate(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

async function assertPublic(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new FetchBlocked("Only http(s) URLs are allowed");
  if (url.port && !["80", "443"].includes(url.port)) throw new FetchBlocked("Non-standard ports are not allowed");
  if (url.username || url.password) throw new FetchBlocked("Credentials in URLs are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new FetchBlocked("Private host");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivate(a.address))) throw new FetchBlocked("Private address");
}

export async function safeFetch(
  input: string,
  { maxBytes = 4_000_000, timeoutMs = 10000, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" } = {},
): Promise<{ url: string; contentType: string; body: Buffer }> {
  let url = new URL(input);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { ...BROWSER_HEADERS, accept },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if ([401, 403, 406, 429, 503].includes(res.status)) throw new SiteRefused(`Site refused the request (${res.status})`);
    if (!res.ok || !res.body) throw new Error(`Fetch failed: ${res.status}`);
    return { url: url.toString(), contentType: res.headers.get("content-type") || "", body: await readCapped(res, maxBytes) };
  }
  throw new FetchBlocked("Too many redirects");
}

async function readCapped(res: Response, maxBytes: number) {
  const len = Number(res.headers.get("content-length") || 0);
  if (len > maxBytes) throw new FetchBlocked("Response too large");
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body!.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new FetchBlocked("Response too large"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export const scraperEnabled = () => Boolean(process.env.SCRAPINGBEE_API_KEY?.trim());

/** ScrapingBee tiers, cheapest first: standard (1 credit), premium (10), premium + real browser (25). */
const TIERS = [
  { name: "standard", params: {} as Record<string, string> },
  { name: "premium", params: { premium_proxy: "true" } },
  { name: "premium + browser", params: { premium_proxy: "true", render_js: "true", block_resources: "false" } },
] as const;

// Remember which tier worked per host for a while, so the other pages and
// photos from the same site skip the tiers that are known to fail.
const tierMemory = new Map<string, { tier: number; at: number }>();
const rememberedTier = (host: string) => {
  const m = tierMemory.get(host);
  return m && Date.now() - m.at < 30 * 60_000 ? m.tier : 0;
};

export interface FetchStep { step: string; ok: boolean; status?: number; ms: number; note?: string }

async function scraperAttempt(url: URL, tier: number, maxBytes: number, timeoutMs: number) {
  const api = new URL("https://app.scrapingbee.com/api/v1/");
  api.searchParams.set("api_key", process.env.SCRAPINGBEE_API_KEY!.trim());
  api.searchParams.set("url", url.toString());
  api.searchParams.set("render_js", "false");
  for (const [k, v] of Object.entries(TIERS[tier].params)) api.searchParams.set(k, v);
  const res = await fetch(api, { signal: AbortSignal.timeout(timeoutMs) });
  if (res.ok && res.body) {
    return {
      ok: true as const,
      status: res.status,
      result: { url: res.headers.get("spb-resolved-url") || url.toString(), contentType: res.headers.get("spb-content-type") || res.headers.get("content-type") || "", body: await readCapped(res, maxBytes) },
    };
  }
  const note = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
  return { ok: false as const, status: res.status, note };
}

/**
 * Fetches through ScrapingBee, which uses connections agent-site firewalls
 * accept. Only used after a direct request is refused.
 */
async function scraperFetch(url: URL, maxBytes: number, steps?: FetchStep[], deadline = Date.now() + 50_000) {
  await assertPublic(url); // never let the service be pointed at private addresses
  let last = "";
  for (let tier = rememberedTier(url.host); tier < TIERS.length; tier++) {
    const remaining = deadline - Date.now();
    if (remaining < 5_000) { last = "ran out of time"; break; }
    const t = Date.now();
    try {
      const r = await scraperAttempt(url, tier, maxBytes, Math.min(remaining, tier === 2 ? 30_000 : 20_000));
      steps?.push({ step: `ScrapingBee (${TIERS[tier].name})`, ok: r.ok, status: r.status, ms: Date.now() - t, note: r.ok ? undefined : r.note });
      if (r.ok) { tierMemory.set(url.host, { tier, at: Date.now() }); return r.result; }
      last = `${TIERS[tier].name}: ${r.status}${r.note ? ` ${r.note}` : ""}`;
      if (r.status === 401 || r.status === 402) break; // bad key or out of credits: retrying won't help
    } catch (e) {
      steps?.push({ step: `ScrapingBee (${TIERS[tier].name})`, ok: false, ms: Date.now() - t, note: (e as Error).message });
      last = `${TIERS[tier].name}: ${(e as Error).message}`;
    }
  }
  throw new SiteRefused(`Site refused the request, including via the scraping service (${last})`);
}

const isRefusal = (e: unknown) =>
  e instanceof SiteRefused || (e instanceof TypeError && /fetch failed/i.test(e.message)) || (e as Error)?.name === "TimeoutError";

/**
 * The importer's fetch: direct first, then the scraping service if the site
 * blocks us (or drops the connection) and a key is configured.
 */
export async function fetchWithFallback(input: string, opts: Parameters<typeof safeFetch>[1] = {}, steps?: FetchStep[], deadline?: number) {
  const url = new URL(input);
  // Known-blocked host: go straight to the tier that worked.
  if (scraperEnabled() && tierMemory.has(url.host) && rememberedTier(url.host) > 0) return scraperFetch(url, opts.maxBytes ?? 4_000_000, steps, deadline);
  const t = Date.now();
  try {
    const r = await safeFetch(input, opts);
    steps?.push({ step: "Direct request", ok: true, status: 200, ms: Date.now() - t });
    return r;
  } catch (e) {
    steps?.push({ step: "Direct request", ok: false, ms: Date.now() - t, note: (e as Error).message });
    if (!isRefusal(e)) throw e;
    if (!scraperEnabled()) throw e instanceof SiteRefused ? e : new SiteRefused((e as Error).message);
    console.warn(`[import] direct fetch refused for ${input}; retrying via scraping service`);
    return scraperFetch(url, opts.maxBytes ?? 4_000_000, steps, deadline);
  }
}

/** Admin diagnostic: runs every step for one URL and reports what happened. */
export async function diagnoseFetch(input: string) {
  const steps: FetchStep[] = [];
  const url = new URL(input);
  tierMemory.delete(url.host);
  let bytes = 0;
  try {
    const r = await fetchWithFallback(input, {}, steps);
    bytes = r.body.length;
  } catch (e) {
    if (!steps.some((s) => s.note === (e as Error).message)) steps.push({ step: "Result", ok: false, ms: 0, note: (e as Error).message });
  }
  return { scraperConfigured: scraperEnabled(), steps, bytes };
}
