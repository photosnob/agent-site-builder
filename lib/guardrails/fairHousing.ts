/**
 * Fair Housing copy lint. Based on HUD advertising guidance categories (race,
 * color, religion, sex, disability, familial status, national origin) plus
 * California's source-of-income protection. This is a first-pass filter, not
 * legal review — extend the lists with your broker/compliance counsel.
 *
 * "block": the edit is rejected. "warn": the agent must confirm before applying.
 */

export type Severity = "block" | "warn";
export interface Finding {
  severity: Severity;
  rule: "fair-housing" | "unverified-claim";
  match: string;
  message: string;
}

const PROTECTED_GROUP = "(?:white|black|caucasian|asian|hispanic|latino|latina|latinx|african[- ]american|chinese|indian|mexican|european|christian|jewish|muslim|catholic|hindu|mormon)";
const PEOPLE = "(?:neighbou?rhood|community|area|buyers|families|residents|people|enclave|crowd)";

const RULES: { re: RegExp; severity: Severity; message: string }[] = [
  { re: new RegExp(`\\b${PROTECTED_GROUP}\\s+${PEOPLE}\\b`, "i"), severity: "block", message: "Describes people or areas by race, religion or national origin." },
  { re: /\b(?:no|not for|not suitable for)\s+(?:kids|children|families|students|disabled|handicapped|wheelchairs?|section\s*8|vouchers?)\b/i, severity: "block", message: "Excludes a protected group (familial status, disability or source of income)." },
  { re: /\badults?[- ]only\b|\bable[- ]bodied\b|\bmentally ill\b/i, severity: "block", message: "Excludes based on familial status or disability." },
  { re: /\b(?:ideal|perfect|great)\s+for\s+(?:young\s+)?(?:families|couples|singles|retirees|empty[- ]nesters|professionals|bachelors|seniors)\b/i, severity: "warn", message: "Describes the ideal buyer instead of the property; HUD treats this as possible steering." },
  { re: /\bfamily[- ]friendly\s+(?:neighbou?rhood|community|area)\b/i, severity: "warn", message: "Implies a preference based on familial status." },
  { re: /\b(?:safe|crime[- ]free|low[- ]crime)\s+(?:neighbou?rhood|area|community|streets?)\b/i, severity: "warn", message: "Safety claims about areas are a common steering risk; describe amenities instead." },
  { re: /\bexclusive\s+(?:neighbou?rhood|community|enclave|area)\b/i, severity: "warn", message: "'Exclusive' can read as exclusionary; prefer 'private', 'gated' or a specific feature." },
  { re: /\b(?:best|top|great|good)\s+schools?\b/i, severity: "warn", message: "School quality claims can be steering; link to official school data instead." },
  { re: /\bnear\s+(?:churches|synagogues|mosques|temples)\b/i, severity: "warn", message: "Religious-landmark framing can imply a religious preference." },
  { re: /\bbachelor\s+pad\b|\bmother[- ]in[- ]law\b|\bmaster\s+(?:bedroom|suite)\b/i, severity: "warn", message: "Many MLSs now ask for neutral terms (e.g. 'primary suite', 'guest unit')." },
];

export function lintFairHousing(text: string): Finding[] {
  const out: Finding[] = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) out.push({ severity: r.severity, rule: "fair-housing", match: m[0], message: r.message });
  }
  return out;
}

const CLAIM_PATTERNS = [
  /#\s?1\b/i,
  /\bnumber\s+one\b/i,
  /\btop\s+\d+(?:\.\d+)?\s?%/i,
  /\btop[- ]producing\b|\btop[- ]selling\b/i,
  /\$\s?\d[\d,.]*\s?(?:k|m|mm|million|b|billion)?\b/i,
  /\b\d+(?:\.\d+)?\s?%/,
  /\b\d{2,}\+?\s+(?:homes|transactions|families|clients|deals|sales|years)\b/i,
  /\bover\s+\d+[\d,]*\b/i,
];

/**
 * Flags production/ranking claims the agent hasn't stated. Real estate
 * advertising rules (and DRE) treat unsubstantiated claims as misleading.
 */
export function lintClaims(text: string, knownFacts: string): Finding[] {
  const facts = normalize(knownFacts);
  const out: Finding[] = [];
  for (const re of CLAIM_PATTERNS) {
    const all = text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) ?? [];
    for (const m of all) {
      if (!facts.includes(normalize(m))) {
        out.push({ severity: "warn", rule: "unverified-claim", match: m, message: `"${m.trim()}" isn't in what you've told us. Confirm it's accurate and substantiated.` });
      }
    }
  }
  return dedupe(out);
}

const normalize = (s: string) => s.toLowerCase().replace(/[\s,]+/g, "");
const dedupe = (f: Finding[]) => f.filter((x, i) => f.findIndex((y) => y.match.toLowerCase() === x.match.toLowerCase()) === i);
