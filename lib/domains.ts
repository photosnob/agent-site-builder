/**
 * Custom domains for agent sites, via the Vercel REST API. Needs VERCEL_TOKEN,
 * VERCEL_PROJECT_ID and (for team projects) VERCEL_TEAM_ID.
 *   POST   /v10/projects/{id}/domains            add (optionally as a redirect)
 *   GET    /v9/projects/{id}/domains/{domain}     verified + TXT challenges
 *   POST   /v9/projects/{id}/domains/{domain}/verify
 *   DELETE /v9/projects/{id}/domains/{domain}
 *   GET    /v6/domains/{domain}/config            misconfigured + recommended A/CNAME
 */

export const domainsConfigured = () => Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").toLowerCase().replace(/:\d+$/, "");
// Two-part public suffixes common for agents; anything else is treated as a single-label TLD.
const TWO_PART = /\.(co|com|net|org|gov|ac)\.(uk|au|nz|za|jp|in|br|mx)$|\.(qc|on|bc)\.ca$/;

/** "HTTPS://WWW.JaneDoe.com/about" → "www.janedoe.com". Null if it isn't a usable domain. */
export function normalizeDomain(input: string): string | null {
  let host = input.trim().toLowerCase();
  if (!host) return null;
  try { host = new URL(/^[a-z]+:\/\//.test(host) ? host : `https://${host}`).hostname; } catch { return null; }
  host = host.replace(/\.$/, "");
  const labels = host.split(".");
  if (labels.length < 2 || host.length > 253) return null;
  if (!labels.every((l) => /^(?!-)[a-z0-9-]{1,63}(?<!-)$/.test(l))) return null;
  if (/^\d+$/.test(labels[labels.length - 1])) return null; // IP address
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(labels[labels.length - 1])) return null;
  return host;
}

/** Domains agents may not claim: ours, Vercel's, and local ones. */
export function isReservedDomain(host: string) {
  return (ROOT && (host === ROOT || host.endsWith(`.${ROOT}`))) || /(^|\.)(vercel\.app|vercel\.com|localhost|lvh\.me|supabase\.co)$/.test(host);
}

/** The registrable domain: www.janedoe.com → janedoe.com, homes.jane.co.uk → jane.co.uk. */
export function apexOf(host: string) {
  const parts = host.split(".");
  return parts.slice(TWO_PART.test(host) ? -3 : -2).join(".");
}

/**
 * Which hostnames to register. The one the agent typed is primary; for an apex or
 * www address the other one redirects to it, so both work.
 */
export function domainPair(host: string): { primary: string; alias: string | null } {
  const apex = apexOf(host);
  if (host === apex) return { primary: host, alias: `www.${host}` };
  if (host === `www.${apex}`) return { primary: host, alias: apex };
  return { primary: host, alias: null };
}

export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string; purpose: string };

/** DNS records to add at the registrar. Host names are relative to the apex ("@" = apex). */
export function recordsFor(primary: string, alias: string | null, ip: string, cname: string): DnsRecord[] {
  const apex = apexOf(primary);
  const rel = (h: string) => (h === apex ? "@" : h.slice(0, -(apex.length + 1)));
  return [primary, alias].filter((h): h is string => Boolean(h)).map((h) => (h === apex
    ? { type: "A", name: "@", value: ip, purpose: h === primary ? "Points your domain to your site" : "Sends visitors to your main address" }
    : { type: "CNAME", name: rel(h), value: cname, purpose: h === primary ? "Points your domain to your site" : "Sends visitors to your main address" }));
}

// ---- Vercel API ----
async function vercel<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T & { error?: { code?: string; message?: string } } }> {
  const url = new URL(`https://api.vercel.com${path}`);
  if (process.env.VERCEL_TEAM_ID) url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  const res = await fetch(url, { ...init, cache: "no-store", headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "Content-Type": "application/json", ...init.headers } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
const project = () => encodeURIComponent(process.env.VERCEL_PROJECT_ID!);

type ProjectDomain = { name: string; verified: boolean; redirect?: string | null; verification?: { type: string; domain: string; value: string; reason: string }[] };

export class DomainError extends Error {}

/** Registers the domain (and its www/apex partner as a redirect) on the Vercel project. */
export async function addDomain(primary: string, alias: string | null) {
  const add = async (body: object) => {
    const r = await vercel<ProjectDomain>(`/v10/projects/${project()}/domains`, { method: "POST", body: JSON.stringify(body) });
    const code = r.data.error?.code ?? "";
    // Already on this project is fine (e.g. retrying).
    if (!r.ok && !(r.status === 400 && /exist/i.test(`${code} ${r.data.error?.message}`))) {
      if (r.status === 409) throw new DomainError("That domain is already connected to another website on our host. If it's yours, remove it there first.");
      if (r.status === 403) throw new DomainError("We don't have access to that domain. If it's managed in someone else's Vercel account, remove it there first.");
      throw new DomainError(r.data.error?.message ?? "Couldn't add that domain.");
    }
  };
  await add({ name: primary });
  if (alias) await add({ name: alias, redirect: primary, redirectStatusCode: 308 });
}

export async function removeDomain(primary: string, alias: string | null) {
  for (const h of [alias, primary]) if (h) await vercel(`/v9/projects/${project()}/domains/${encodeURIComponent(h)}`, { method: "DELETE" });
}

export type DomainCheck = {
  status: "active" | "pending" | "error";
  records: DnsRecord[];
  /** Plain-English status for the agent. */
  message: string;
};

/** Checks ownership verification and DNS, and returns the records the agent should have. */
export async function checkDomain(primary: string, alias: string | null): Promise<DomainCheck> {
  let pd = await vercel<ProjectDomain>(`/v9/projects/${project()}/domains/${encodeURIComponent(primary)}`);
  if (pd.status === 404) return { status: "error", records: [], message: "This domain isn't registered with our host anymore. Remove it and add it again." };
  if (pd.ok && !pd.data.verified) {
    const v = await vercel<ProjectDomain>(`/v9/projects/${project()}/domains/${encodeURIComponent(primary)}/verify`, { method: "POST" });
    if (v.ok) pd = v;
  }
  const cnameHost = [primary, alias].find((h) => h && h !== apexOf(primary)) ?? primary;
  const [apexCfg, cnameCfg] = await Promise.all([
    vercel<{ misconfigured: boolean; recommendedIPv4?: { rank: number; value: string[] }[]; recommendedCNAME?: { rank: number; value: string }[] }>(`/v6/domains/${encodeURIComponent(primary)}/config`),
    vercel<{ recommendedCNAME?: { rank: number; value: string }[] }>(`/v6/domains/${encodeURIComponent(cnameHost)}/config`),
  ]);
  const pick = <T,>(list: { rank: number; value: T }[] | undefined) => list?.slice().sort((a, b) => a.rank - b.rank)[0]?.value;
  const ip = pick(apexCfg.data.recommendedIPv4)?.[0] ?? "76.76.21.21";
  const cname = (pick(cnameCfg.data.recommendedCNAME) ?? pick(apexCfg.data.recommendedCNAME) ?? "cname.vercel-dns.com").replace(/\.$/, "");
  const records = recordsFor(primary, alias, ip, cname);
  const challenges = (pd.data.verification ?? []).filter((c) => c.type === "TXT");
  for (const c of challenges) records.push({ type: "TXT", name: c.domain === apexOf(primary) ? "@" : c.domain.replace(`.${apexOf(primary)}`, ""), value: c.value, purpose: "Proves you own the domain (it's in use elsewhere)" });

  if (!pd.ok) return { status: "error", records, message: "We couldn't check this domain right now. Try again in a minute." };
  if (!pd.data.verified) return { status: "pending", records, message: "Waiting for the ownership record (TXT). Add it at your domain provider; it can take up to an hour to be seen." };
  if (apexCfg.ok && apexCfg.data.misconfigured) return { status: "pending", records, message: "Waiting for your DNS records. After you add them it usually takes a few minutes, occasionally up to 48 hours." };
  return { status: "active", records, message: "Connected. Your site is live at this address with a secure (https) certificate." };
}
