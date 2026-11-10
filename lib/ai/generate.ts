import { z } from "zod";
import { SiteContent, newBlockId, type Block } from "../blocks/schema";
import { lintClaims, lintFairHousing, type Finding } from "../guardrails/fairHousing";
import { TEMPLATES, type TemplateId } from "../templates";
import { listStockVideos } from "../media";
import type { AgentProfile, ImportData, SiteAsset } from "../types";
import { aiEnabled, callStructured, untrusted } from "./claude";
import type { TrackInfo } from "./usage";

/**
 * The model writes copy only. Structure, images, testimonials and stats are
 * assembled here from data the agent provided, so the AI can't invent
 * reviews, numbers or image URLs.
 */
const Copy = z.object({
  hero: z.object({ eyebrow: z.string().max(60), headline: z.string().max(90), subheadline: z.string().max(220), ctaLabel: z.string().max(30) }),
  about: z.object({ headline: z.string().max(90), body: z.string().max(1400) }),
  listings: z.object({ headline: z.string().max(90), intro: z.string().max(300) }),
  neighborhoods: z.object({ headline: z.string().max(90), blurbs: z.array(z.string().max(320)).max(8) }),
  testimonials: z.object({ headline: z.string().max(90) }),
  cta: z.object({ headline: z.string().max(90), body: z.string().max(300), buttonLabel: z.string().max(30) }),
  contact: z.object({ headline: z.string().max(90), body: z.string().max(300) }),
});
type Copy = z.infer<typeof Copy>;

export function factsOf(agent: AgentProfile, imported?: ImportData | null) {
  return [
    agent.name,
    agent.brokerage,
    agent.serviceAreas.join(", "),
    agent.specialties.join(", "),
    agent.yearsExperience != null ? `${agent.yearsExperience} years` : "",
    ...agent.claims.map((c) => `${c.value} ${c.label}`),
    agent.bio,
    imported?.bio ?? "",
  ].join("\n");
}

function defaultCopy(agent: AgentProfile): Copy {
  const area = agent.serviceAreas[0];
  const first = agent.name.split(" ")[0];
  return {
    hero: {
      eyebrow: agent.brokerage,
      headline: `Real estate in ${area}, done with care`,
      subheadline: `${first} helps buyers and sellers across ${agent.serviceAreas.join(", ")} with local insight and a calm, clear process.`,
      ctaLabel: "Let's talk",
    },
    about: {
      headline: `Meet ${first}`,
      body: agent.bio || `${agent.name} is a real estate agent with ${agent.brokerage}, serving ${agent.serviceAreas.join(", ")}.`,
    },
    listings: { headline: "Featured properties", intro: "A selection of recent listings and sales." },
    neighborhoods: { headline: "Where I work", blurbs: agent.serviceAreas.map((a) => `Local knowledge of ${a}: pricing, inventory and what's changing on the ground.`) },
    testimonials: { headline: "What clients say" },
    cta: { headline: "Thinking about selling?", body: "Get a no-pressure estimate of what your home could sell for in today's market.", buttonLabel: "Get my home value" },
    contact: { headline: "Get in touch", body: "Tell me a little about what you're looking for and I'll reply within one business day." },
  };
}

async function writeCopy(agent: AgentProfile, templateId: TemplateId, imported: ImportData | null | undefined, track: TrackInfo): Promise<Copy> {
  if (!aiEnabled()) return defaultCopy(agent);
  const t = TEMPLATES[templateId];
  try {
    const { data } = await callStructured({
      track,
      toolName: "write_site_copy",
      toolDescription: "Return the copy for each section of the agent's website.",
      schema: Copy,
      system: [
        "You write website copy for licensed real estate agents.",
        `Voice: ${t.voiceHint}; agent tone preference: ${agent.tone}.`,
        "Rules:",
        "- Only state facts present in the agent profile or their existing bio. Never invent sales volume, rankings, awards, years, or reviews.",
        "- Follow the Fair Housing Act: describe properties and places, never the kind of person who should live there. No references to race, religion, national origin, sex, disability, familial status, or school quality. Avoid 'safe', 'exclusive', 'family-friendly'.",
        "- No markup, links, emoji or exclamation-heavy hype. Plain sentences.",
        "- neighborhoods.blurbs: one blurb per service area, in the same order, about the place (architecture, setting, lifestyle amenities), not its residents.",
        "- about.body: 2–3 short paragraphs separated by a blank line, first person or third person consistently.",
      ].join("\n"),
      user: [
        `Agent profile (trusted):\n${JSON.stringify({ name: agent.name, brokerage: agent.brokerage, serviceAreas: agent.serviceAreas, specialties: agent.specialties, yearsExperience: agent.yearsExperience, claims: agent.claims })}`,
        agent.bio ? untrusted("agent_written_bio", agent.bio) : "",
        imported?.bio ? untrusted("bio_from_existing_website", imported.bio) : "",
      ].join("\n\n"),
    });
    return data;
  } catch (e) {
    console.error("copy generation failed, using defaults", e);
    return defaultCopy(agent);
  }
}

export async function generateSite(input: {
  agent: AgentProfile;
  templateId: TemplateId;
  assets: SiteAsset[];
  imported?: ImportData | null;
  siteId?: string;
  userId?: string;
}): Promise<{ content: SiteContent; warnings: Finding[] }> {
  const { agent, templateId, assets, imported } = input;
  const copy = await writeCopy(agent, templateId, imported, { feature: "generate", siteId: input.siteId, userId: input.userId });
  const fallback = defaultCopy(agent);
  const facts = factsOf(agent, imported);
  const warnings: Finding[] = [];

  // Lint every generated string; anything Fair-Housing-blocking reverts to the default.
  const safe = (value: string, def: string) => {
    const fh = lintFairHousing(value);
    if (fh.some((f) => f.severity === "block")) return def;
    warnings.push(...fh, ...lintClaims(value, facts));
    return value;
  };

  const headshot = assets.find((a) => a.kind === "headshot")?.url;
  const listings = assets.filter((a) => a.kind === "listing").slice(0, 9);
  const testimonials = (imported?.testimonials ?? []).slice(0, 4);
  // Video templates start on the first stock clip so they look finished before the agent uploads their own.
  const stockVideo = TEMPLATES[templateId].theme.heroStyle === "video" ? (await listStockVideos().catch(() => []))[0]?.url : undefined;

  const build: Record<string, () => Block | null> = {
    hero: () => ({
      type: "hero", id: newBlockId("hero"),
      props: {
        eyebrow: safe(copy.hero.eyebrow, fallback.hero.eyebrow),
        headline: safe(copy.hero.headline, fallback.hero.headline),
        subheadline: safe(copy.hero.subheadline, fallback.hero.subheadline),
        ctaLabel: copy.hero.ctaLabel || "Let's talk",
        ctaTarget: "contact",
        image: ["estate", "noir", "riviera", "bright"].includes(templateId) ? (listings[0]?.url ?? headshot) : headshot,
        ...(TEMPLATES[templateId].theme.heroStyle === "video" && stockVideo ? { videoUrl: stockVideo, videoSpeed: 0.75 } : {}),
      },
    }),
    about: () => ({
      type: "about", id: newBlockId("about"),
      props: { headline: safe(copy.about.headline, fallback.about.headline), body: safe(copy.about.body, fallback.about.body), image: headshot },
    }),
    "featured-listings": () =>
      listings.length === 0 ? null : {
        type: "featured-listings", id: newBlockId("listings"),
        props: {
          headline: safe(copy.listings.headline, fallback.listings.headline),
          intro: safe(copy.listings.intro, fallback.listings.intro ?? ""),
          items: listings.map((l) => ({
            image: l.url,
            address: l.meta.address || "Address available on request",
            price: l.meta.price,
            status: (["active", "pending", "sold", "coming-soon"].includes(l.meta.status ?? "") ? l.meta.status : "sold") as "sold",
          })),
        },
      },
    neighborhoods: () => ({
      type: "neighborhoods", id: newBlockId("areas"),
      props: {
        headline: safe(copy.neighborhoods.headline, fallback.neighborhoods.headline),
        items: agent.serviceAreas.map((name, i) => ({ name, blurb: safe(copy.neighborhoods.blurbs[i] ?? fallback.neighborhoods.blurbs[i], fallback.neighborhoods.blurbs[i]) })),
      },
    }),
    testimonials: () =>
      testimonials.length === 0 ? null : { type: "testimonials", id: newBlockId("reviews"), props: { headline: copy.testimonials.headline, items: testimonials } },
    stats: () => {
      const items = [...agent.claims];
      if (agent.yearsExperience) items.unshift({ value: `${agent.yearsExperience}`, label: "Years of experience" });
      return items.length === 0 ? null : { type: "stats", id: newBlockId("stats"), props: { items: items.slice(0, 4) } };
    },
    cta: () => ({
      type: "cta", id: newBlockId("cta"),
      props: {
        headline: safe(copy.cta.headline, fallback.cta.headline), body: safe(copy.cta.body, fallback.cta.body), buttonLabel: copy.cta.buttonLabel || "Get my home value", target: "valuation",
        // Photo-band looks use a second listing photo behind the call to action.
        ...(TEMPLATES[templateId].theme.look !== "classic" && (listings[1] ?? listings[0]) ? { image: (listings[1] ?? listings[0]).url } : {}),
      },
    }),
    contact: () => ({
      type: "contact", id: newBlockId("contact"),
      props: { headline: safe(copy.contact.headline, fallback.contact.headline), body: safe(copy.contact.body, fallback.contact.body), showPhone: Boolean(agent.phone) },
    }),
  };

  const blocks = TEMPLATES[templateId].layout.map((t) => build[t]()).filter((b): b is Block => b !== null);
  const content = SiteContent.parse({ blocks });
  return { content, warnings };
}
