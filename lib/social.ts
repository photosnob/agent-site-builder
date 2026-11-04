/** Social profile links an agent can add. Validated to the network's own domain. */
export const SOCIAL_NETWORKS = {
  instagram: { label: "Instagram", hosts: ["instagram.com"], example: "https://instagram.com/yourname" },
  facebook: { label: "Facebook", hosts: ["facebook.com", "fb.com"], example: "https://facebook.com/yourpage" },
  linkedin: { label: "LinkedIn", hosts: ["linkedin.com"], example: "https://linkedin.com/in/yourname" },
} as const;
export type SocialNetwork = keyof typeof SOCIAL_NETWORKS;

/** Accepts "instagram.com/x", "@x" (Instagram), or full URLs; returns a clean https URL or an error. */
export function normalizeSocial(network: SocialNetwork, raw: string): { url?: string; error?: string } {
  let v = raw.trim();
  if (!v) return {};
  // A bare handle ("@pete" or "pete.realtor"), but not a domain like "instagram.com".
  if (network === "instagram" && /^@?[\w.]{1,30}$/.test(v) && (v.startsWith("@") || !/\.(com|net|org|co)$/i.test(v))) v = `https://instagram.com/${v.replace(/^@/, "")}`;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    const host = u.hostname.replace(/^(www\.|m\.)/, "");
    if (!SOCIAL_NETWORKS[network].hosts.some((h) => host === h)) return { error: `That doesn't look like a ${SOCIAL_NETWORKS[network].label} link.` };
    if (u.pathname.length <= 1) return { error: `Add your ${SOCIAL_NETWORKS[network].label} profile path, e.g. ${SOCIAL_NETWORKS[network].example}` };
    u.protocol = "https:";
    u.search = "";
    u.hash = "";
    return { url: u.toString().replace(/\/$/, "") };
  } catch {
    return { error: `That doesn't look like a ${SOCIAL_NETWORKS[network].label} link.` };
  }
}

/** First one or two sentences, for a default author bio. */
export function briefBio(text?: string, max = 280) {
  if (!text) return "";
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+/g) ?? [text];
  let out = "";
  for (const [i, s] of sentences.entries()) {
    if (i >= 2 || (out + s).length > max) break;
    out += s;
    if (out.length > 120) break;
  }
  return (out || text.slice(0, max)).trim();
}
