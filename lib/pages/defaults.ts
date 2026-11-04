import { z } from "zod";
import { PageContent, newBlockId, type Block } from "../blocks/schema";
import { lintFairHousing } from "../guardrails/fairHousing";
import type { AgentProfile } from "../types";
import { aiEnabled, callStructured } from "../ai/claude";

export type PageKind = "buy" | "sell" | "team" | "reviews";

export const DEFAULT_PAGES: { kind: PageKind; slug: string; title: string; nav: string }[] = [
  { kind: "buy", slug: "buy", title: "Buy", nav: "Buy" },
  { kind: "sell", slug: "sell", title: "Sell", nav: "Sell" },
  { kind: "team", slug: "team", title: "Meet the Team", nav: "Team" },
  { kind: "reviews", slug: "success-stories", title: "Success Stories", nav: "Success Stories" },
];

/** The copy the AI may personalize; everything else on these pages is structural or data-driven. */
const PageCopy = z.object({
  buy: z.object({
    headline: z.string().max(90),
    intro: z.string().max(400),
    whyHeadline: z.string().max(90),
    whyBody: z.string().max(2000).describe("2-3 short paragraphs separated by a blank line"),
    steps: z.array(z.object({ title: z.string().max(80), body: z.string().max(600) })).min(5).max(7),
    faqs: z.array(z.object({ q: z.string().max(160), a: z.string().max(900) })).min(3).max(6),
  }),
  sell: z.object({
    headline: z.string().max(90),
    intro: z.string().max(400),
    beforeHeadline: z.string().max(90),
    beforeBody: z.string().max(2000),
    steps: z.array(z.object({ title: z.string().max(80), body: z.string().max(600) })).min(5).max(8),
    faqs: z.array(z.object({ q: z.string().max(160), a: z.string().max(900) })).min(3).max(6),
  }),
});
type PageCopy = z.infer<typeof PageCopy>;

function defaultCopy(a: Partial<AgentProfile>): PageCopy {
  const first = a.name?.split(" ")[0] ?? "us";
  const areas = (a.serviceAreas ?? []).join(", ") || "the area";
  const area = a.serviceAreas?.[0] ?? "your area";
  return {
    buy: {
      headline: `Why buy with ${first}`,
      intro: `Clear advice, honest numbers and a steady hand from first showing to keys in your hand, across ${areas}.`,
      whyHeadline: "A buying process built around you",
      whyBody: `Buying a home is one of the biggest decisions you'll make, and the market in ${area} moves quickly. ${first} helps you understand what homes are really selling for, what to look for in a property, and how to put together an offer that stands out without overpaying.\n\nYou'll get straight answers, fast communication and a clear plan for every step, so you can make confident decisions instead of rushed ones.`,
      steps: [
        { title: "Start with a conversation", body: "We talk through your goals, timeline, must-haves and budget so the search is focused from day one." },
        { title: "Get pre-approved", body: "A lender pre-approval shows sellers you're serious and tells you exactly what you can comfortably spend. I can introduce you to trusted local lenders." },
        { title: "Tour homes with a plan", body: "I'll send new listings that fit, including homes before they hit the major sites when possible, and help you compare value, condition and resale potential." },
        { title: "Write a winning offer", body: "We look at recent sales, the seller's situation and current competition to set price and terms that give you the best chance without overpaying." },
        { title: "Inspections and escrow", body: "I coordinate inspections, disclosures and deadlines, and help you negotiate repairs or credits based on what we find." },
        { title: "Close and move in", body: "Final walkthrough, signing and keys. I'm still here after closing for contractor referrals and questions." },
      ],
      faqs: [
        { q: "How much do I need for a down payment?", a: "It depends on the loan. Some programs allow as little as 3 to 3.5% down, while 20% avoids private mortgage insurance on conventional loans. A lender can show you the options for your situation." },
        { q: "How long does it take to buy a home?", a: "Many buyers find the right home within a few weeks to a few months. Once an offer is accepted, escrow typically takes about 30 days." },
        { q: "What does it cost to work with a buyer's agent?", a: "Compensation is agreed up front in a written buyer agreement, and is sometimes paid by the seller as part of the deal. We'll go over the options clearly before you start touring." },
        { q: "Should I sell my current home first?", a: "It depends on your finances and the market. We can compare buying first, selling first, and contingent offers so you can choose the least stressful path." },
      ],
    },
    sell: {
      headline: "Seller's Guide",
      intro: `Everything you need to know before you list your home in ${area}, from pricing to closing.`,
      beforeHeadline: "Everything you need to know before you list",
      beforeBody: `The right preparation, price and marketing make a real difference to how quickly your home sells and how much you walk away with. ${first} combines current local market data with a hands-on plan for presenting your home at its best.\n\nThis guide walks through the process step by step, so you know what to expect and what decisions are coming up.`,
      steps: [
        { title: "Consultation and pricing", body: "We walk through your home and goals, then review recent comparable sales and current competition to set a price strategy that attracts strong offers." },
        { title: "Prepare your home", body: "A punch list of high-impact repairs, decluttering and touch-ups. Small, inexpensive changes often matter more than big renovations." },
        { title: "Staging and photography", body: "Professional photography, and staging where it helps, so your home looks its best online, where most buyers first see it." },
        { title: "Launch and marketing", body: "Your listing goes live on the MLS and major home search sites, with social media, email to local agents and buyers, and open houses." },
        { title: "Showings and feedback", body: "I schedule and manage showings, gather feedback and keep you updated on activity and interest." },
        { title: "Offers and negotiation", body: "We compare every offer on price, financing, contingencies and timing, and negotiate the terms that best fit your goals." },
        { title: "Escrow to closing", body: "I manage inspections, appraisal, disclosures and deadlines through closing, and keep everything moving on schedule." },
      ],
      faqs: [
        { q: "What is a home valuation?", a: "An estimate of what your home would likely sell for in today's market, based on recent sales of similar homes nearby, current competition and your home's condition and features." },
        { q: "How is my home's value calculated?", a: "Through a comparative market analysis: recent nearby sales of similar size, age and condition, adjusted for differences like updates, lot, views and layout, plus what's currently for sale." },
        { q: "How accurate are online home value estimates?", a: "They're a starting point, but automated estimates can't see your home's condition or recent updates. A local walkthrough gives a far more reliable number." },
        { q: "When is the best time to sell?", a: "Spring is often busiest, but the best time depends on inventory in your neighborhood and your own plans. We can look at current local data together." },
      ],
    },
  };
}

async function writeCopy(a: Partial<AgentProfile>, track: { siteId?: string; userId?: string }): Promise<PageCopy> {
  const fallback = defaultCopy(a);
  if (!aiEnabled()) return fallback;
  try {
    const { data } = await callStructured({
      track: { feature: "generate", ...track },
      toolName: "write_page_copy",
      toolDescription: "Write original copy for the agent's Buy page and Seller's Guide page.",
      schema: PageCopy,
      maxTokens: 6000,
      system: [
        "You write original website copy for a licensed real estate agent's Buy page and Seller's Guide page.",
        "Use the agent's name, service areas and specialties naturally. Keep the agent's voice warm, clear and practical.",
        "Rules: never invent statistics, rankings, sales volume, awards or reviews. Use general, accurate guidance, not legal or tax advice.",
        "Follow the Fair Housing Act: describe homes, process and places, never who should live somewhere. No references to schools' quality, safety, or protected classes.",
        "Plain text only, no markdown. The example copy shows the expected structure and length; write fresh wording rather than copying it.",
      ].join("\n"),
      user: `Agent: ${JSON.stringify({ name: a.name, brokerage: a.brokerage, serviceAreas: a.serviceAreas, specialties: a.specialties, tone: a.tone })}\n\nExample structure:\n${JSON.stringify(fallback)}`,
    });
    // Any Fair Housing problem in the AI copy → use the reviewed default for that page.
    const bad = (o: unknown) => lintFairHousing(JSON.stringify(o)).some((f) => f.severity === "block");
    return { buy: bad(data.buy) ? fallback.buy : data.buy, sell: bad(data.sell) ? fallback.sell : data.sell };
  } catch (e) {
    console.error("page copy generation failed, using defaults", e);
    return fallback;
  }
}

const id = newBlockId;

export function buildPage(kind: PageKind, copy: PageCopy, a: Partial<AgentProfile>): PageContent {
  const first = a.name?.split(" ")[0] ?? "us";
  const contact: Block = { type: "contact", id: id("contact"), props: { headline: "Get in touch", body: "Tell me a little about what you're looking for and I'll reply within one business day.", showPhone: Boolean(a.phone) } };
  let blocks: Block[];
  switch (kind) {
    case "buy":
      blocks = [
        { type: "page-header", id: id("header"), props: { eyebrow: "Buying", headline: copy.buy.headline, intro: copy.buy.intro } },
        { type: "rich-text", id: id("why"), props: { headline: copy.buy.whyHeadline, body: copy.buy.whyBody } },
        { type: "steps", id: id("steps"), props: { headline: "How buying works", items: copy.buy.steps } },
        { type: "featured-listings", id: id("listings"), props: { headline: "Featured homes", items: [] } },
        { type: "faq", id: id("faq"), props: { headline: "Buyer questions", items: copy.buy.faqs } },
        { type: "cta", id: id("cta"), props: { headline: "Ready to start your search?", body: `Tell ${first} what you're looking for and get a personalized list of homes.`, buttonLabel: "Start my search", target: "contact" } },
        contact,
      ];
      break;
    case "sell":
      blocks = [
        { type: "page-header", id: id("header"), props: { eyebrow: "Selling", headline: copy.sell.headline, intro: copy.sell.intro } },
        { type: "rich-text", id: id("before"), props: { headline: copy.sell.beforeHeadline, body: copy.sell.beforeBody } },
        { type: "cta", id: id("value"), props: { headline: "How much is your home worth?", body: "Get a no-pressure valuation based on recent sales near you, from someone who has walked the neighborhood.", buttonLabel: "Get my home value", target: "valuation" } },
        { type: "steps", id: id("steps"), props: { headline: "The selling process, step by step", items: copy.sell.steps } },
        { type: "faq", id: id("faq"), props: { headline: "Home valuation questions", items: copy.sell.faqs } },
        { type: "featured-listings", id: id("listings"), props: { headline: "Recent listings and sales", items: [] } },
        { type: "recent-posts", id: id("posts"), props: { headline: "Selling tips from the blog", count: 3 } },
        contact,
      ];
      break;
    case "team":
      blocks = [
        { type: "page-header", id: id("header"), props: { eyebrow: "About us", headline: "Meet the Team", intro: `The people behind every move${a.serviceAreas?.length ? ` across ${a.serviceAreas.join(", ")}` : ""}.` } },
        { type: "team-grid", id: id("team"), props: { headline: "Our team" } },
        { type: "cta", id: id("cta"), props: { headline: "Let's talk about your move", body: "Whether you're buying, selling or just planning ahead, we're happy to help.", buttonLabel: "Contact us", target: "contact" } },
        contact,
      ];
      break;
    case "reviews":
      blocks = [
        { type: "page-header", id: id("header"), props: { eyebrow: "Client stories", headline: "Success Stories", intro: "What clients say about working together." } },
        { type: "reviews", id: id("reviews"), props: { headline: "In their words", mode: "all" } },
        { type: "cta", id: id("cta"), props: { headline: "Your story could be next", body: `Tell ${first} about your plans and let's make them happen.`, buttonLabel: "Get in touch", target: "contact" } },
        contact,
      ];
      break;
  }
  return PageContent.parse({ blocks });
}

/** Builds content for the given default pages (one AI call covers Buy and Sell). */
export async function generateDefaultPages(a: Partial<AgentProfile>, kinds: PageKind[], track: { siteId?: string; userId?: string }) {
  const needsCopy = kinds.some((k) => k === "buy" || k === "sell");
  const copy = needsCopy ? await writeCopy(a, track) : defaultCopy(a);
  return kinds.map((kind) => ({ ...DEFAULT_PAGES.find((p) => p.kind === kind)!, content: buildPage(kind, copy, a) }));
}

export const _test = { defaultCopy };
