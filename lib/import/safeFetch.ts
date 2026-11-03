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
    const len = Number(res.headers.get("content-length") || 0);
    if (len > maxBytes) throw new FetchBlocked("Response too large");
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new FetchBlocked("Response too large"); }
      chunks.push(value);
    }
    return { url: url.toString(), contentType: res.headers.get("content-type") || "", body: Buffer.concat(chunks) };
  }
  throw new FetchBlocked("Too many redirects");
}
