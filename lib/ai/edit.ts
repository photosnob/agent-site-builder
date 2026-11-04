import type { AnyContent } from "../blocks/schema";
import { FONT_PAIRS, type Theme } from "../blocks/theme";
import { ModelEditPlan, applyEditPlan, describeForModel, fromModelPlan, type EditPlan, type GuardResult } from "../guardrails/ops";
import { TEMPLATES, type TemplateId } from "../templates";
import type { AgentProfile, ImportData, SiteAsset } from "../types";
import { callStructured, untrusted } from "./claude";
import { factsOf } from "./generate";

export async function planAndApplyEdit(input: {
  prompt: string;
  content: AnyContent;
  /** Which page is being edited, for the model and the structural rules. */
  page?: { kind: "home" | "page"; title: string };
  theme: Theme;
  templateId: TemplateId;
  agent: AgentProfile;
  assets: SiteAsset[];
  imported?: ImportData | null;
  siteId: string;
  userId: string;
}): Promise<GuardResult & { plan: EditPlan; usageEventId: string | null }> {
  const t = TEMPLATES[input.templateId];
  const { data: modelPlan, usageEventId } = await callStructured({
    track: { feature: "edit", siteId: input.siteId, userId: input.userId, prompt: input.prompt },
    toolName: "propose_edit",
    toolDescription: "Propose a small set of edit operations for the agent's website.",
    schema: ModelEditPlan,
    maxTokens: 3000,
    system: [
      "You edit a real estate agent's website by returning edit operations. You never write HTML, CSS or code.",
      "Scope: copy, section order, adding/removing sections, swapping images from the agent's library, and choosing among the listed style options.",
      "Out of scope — set `refusal` and return no ops: adding scripts, embeds, tracking or custom code; changing license number, brokerage or legal disclaimers (they're managed in Profile); editing other sites; anything unrelated to the website.",
      "Rules:",
      "- Make the smallest change that satisfies the request. Keep block ids exactly as given.",
      "- If the request needs a photo or video that isn't in the image library, set `refusal` and tell the agent where to add it: headshot → Settings → Profile photo; logo → Settings → Logo; hero photos or video → Hero style panel above this box; listing photos → Listings; team photos → Team.",
      "- Don't invent facts: no new numbers, rankings, awards, sales volume, or testimonials beyond what's in the agent facts or the request itself.",
      "- Fair Housing: describe properties and places, never who should live there. No race, religion, national origin, sex, disability, familial status, or school-quality claims.",
      "- Paths for set_text are relative to props, e.g. 'headline' or 'items.1.blurb'.",
      "- add_block: put the new section's fields in propsJson as a JSON object string, matching that block type's fields as used elsewhere on the page. set_list_item: put the item in itemJson as a JSON object string.",
      "- The About section photo can be resized with set_image_size: small, medium or large (default large). \"Smaller\" from large means medium; from medium means small. Other images can't be resized.",
      `- Style options: palette one of ${t.allowedPalettes.join(", ")}; fonts one of ${Object.keys(FONT_PAIRS).join(", ")}; radius none|soft|round; heroStyle full-bleed|split|centered.`,
      "- summary: one or two plain sentences telling the agent what will change.",
    ].join("\n"),
    user: [
      `Agent facts (trusted):\n${factsOf(input.agent)}`,
      `Image library:\n${JSON.stringify(input.assets.map((a) => ({ assetId: a.id, kind: a.kind, ...a.meta })))}`,
      `Current theme: ${JSON.stringify(input.theme)}`,
      `Page being edited: ${input.page?.kind === "page" ? `the "${input.page.title}" page (starts with a page-header; heroes are home-page only)` : "the home page (starts with the hero)"}`,
      untrusted("current_page_blocks", describeForModel(input.content)),
      `Agent's request:\n${input.prompt}`,
    ].join("\n\n"),
  });

  const { plan, errors: conversionErrors } = fromModelPlan(modelPlan);
  if (conversionErrors.length && !plan.refusal) {
    return { plan, usageEventId, ok: false, content: input.content, theme: input.theme, errors: conversionErrors, warnings: [], changedText: [] };
  }
  if (plan.refusal) {
    return { plan, usageEventId, ok: false, content: input.content, theme: input.theme, errors: [plan.refusal], warnings: [], changedText: [] };
  }

  const result = applyEditPlan(plan, {
    kind: input.page?.kind ?? "home",
    content: input.content,
    theme: input.theme,
    allowedPalettes: t.allowedPalettes,
    assets: input.assets,
    // The agent's own request counts as a stated fact (e.g. "add that I sold 40 homes").
    knownFacts: `${factsOf(input.agent, input.imported)}\n${input.prompt}`,
  });
  return { ...result, plan, usageEventId };
}
