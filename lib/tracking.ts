import { z } from "zod";

/**
 * Analytics and ad tags an agent can add to their site. Agents enter IDs only;
 * we render each vendor's official snippet. IDs are strictly validated, so
 * nothing an agent types can become script on the page.
 */
export const TRACKERS = {
  gtm: { label: "Google Tag Manager", hint: "Container ID, like GTM-AB12CD3", re: /^GTM-[A-Z0-9]{4,12}$/, find: /GTM-[A-Z0-9]{4,12}/i },
  ga4: { label: "Google Analytics 4", hint: "Measurement ID, like G-AB12CD34EF", re: /^G-[A-Z0-9]{4,15}$/, find: /\bG-[A-Z0-9]{4,15}\b/i },
  googleAds: { label: "Google Ads", hint: "Conversion ID, like AW-123456789", re: /^AW-\d{6,12}$/, find: /AW-\d{6,12}/i },
  metaPixel: { label: "Meta (Facebook) Pixel", hint: "Pixel ID, 15–16 digits", re: /^\d{10,20}$/, find: /(?:fbq\(\s*['"]init['"]\s*,\s*['"]|id=)?(\d{10,20})/ },
  linkedin: { label: "LinkedIn Insight Tag", hint: "Partner ID, like 1234567", re: /^\d{3,12}$/, find: /(?:partner_id\s*=\s*["']?|pid=)?(\d{3,12})/ },
} as const;
export type TrackerKey = keyof typeof TRACKERS;
export const TRACKER_KEYS = Object.keys(TRACKERS) as TrackerKey[];

export const SiteTracking = z.object(
  Object.fromEntries(TRACKER_KEYS.map((k) => [k, z.string().regex(TRACKERS[k].re, `That doesn't look like a ${TRACKERS[k].label} ID (${TRACKERS[k].hint})`).optional()])) as Record<TrackerKey, z.ZodOptional<z.ZodString>>,
);
export type SiteTracking = z.infer<typeof SiteTracking>;

/** Accepts a bare ID or the whole snippet the vendor gave the agent, and pulls the ID out. */
export function extractTrackerId(key: TrackerKey, input: string): string {
  const t = input.trim();
  if (!t) return "";
  const id = TRACKERS[key].re.test(t.toUpperCase()) ? t : (t.match(TRACKERS[key].find)?.[1] ?? t.match(TRACKERS[key].find)?.[0] ?? t);
  return key === "metaPixel" || key === "linkedin" ? id.replace(/\D/g, "") : id.toUpperCase();
}
