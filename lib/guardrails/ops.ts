import { z } from "zod";
import { BLOCK_TYPES, Block, REQUIRED_BLOCKS, SiteContent, imagesIn, newBlockId } from "../blocks/schema";
import { Theme } from "../blocks/theme";
import type { SiteAsset } from "../types";
import { lintClaims, lintFairHousing, type Finding } from "./fairHousing";

/**
 * Prompt edits are expressed as a short list of typed operations instead of a
 * rewritten page. The model can only touch content through these, and every
 * result is re-validated against the site schema before the agent sees it.
 */

const textPath = z
  .string()
  .regex(/^[a-zA-Z]+(?:\.\d{1,2}\.[a-zA-Z]+)?$/, "Path must look like 'headline' or 'items.0.quote'");

export const EditOp = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_text"), blockId: z.string(), path: textPath, value: z.string().max(1400) }),
  z.object({ op: z.literal("set_image"), blockId: z.string(), assetId: z.string() }),
  z.object({ op: z.literal("add_block"), type: z.enum(BLOCK_TYPES), afterBlockId: z.string(), props: z.record(z.string(), z.unknown()) }),
  z.object({ op: z.literal("remove_block"), blockId: z.string() }),
  z.object({ op: z.literal("move_block"), blockId: z.string(), afterBlockId: z.string() }),
  z.object({ op: z.literal("set_list_item"), blockId: z.string(), index: z.number().int().min(0).max(11), item: z.record(z.string(), z.unknown()) }),
  z.object({ op: z.literal("remove_list_item"), blockId: z.string(), index: z.number().int().min(0).max(11) }),
  z.object({ op: z.literal("add_listing"), blockId: z.string(), assetId: z.string() }),
  z.object({ op: z.literal("set_theme"), palette: z.string().optional(), fonts: z.string().optional(), radius: z.string().optional(), heroStyle: z.string().optional() }),
]);
export type EditOp = z.infer<typeof EditOp>;

export const EditPlan = z.object({
  summary: z.string().max(400),
  /** Set when the request is out of bounds (code, compliance info, other sites…). */
  refusal: z.string().max(400).optional(),
  ops: z.array(EditOp).max(12),
});
export type EditPlan = z.infer<typeof EditPlan>;

/** Fields an edit may never write with set_text. Images go through set_image only. */
const NON_TEXT_FIELDS = new Set(["image", "ctaTarget", "target", "showPhone", "status", "beds", "baths", "sqft"]);

export interface GuardContext {
  content: SiteContent;
  theme: Theme;
  allowedPalettes: string[];
  assets: SiteAsset[];
  /** Everything the agent has stated: onboarding answers + this prompt. Claims must be grounded here. */
  knownFacts: string;
}

export interface GuardResult {
  ok: boolean;
  content: SiteContent;
  theme: Theme;
  errors: string[];
  warnings: Finding[];
  changedText: string[];
}

export function applyEditPlan(plan: EditPlan, ctx: GuardContext): GuardResult {
  const errors: string[] = [];
  const changedText: string[] = [];
  const blocks: Record<string, unknown>[] = structuredClone(ctx.content.blocks) as never;
  let theme: Theme = { ...ctx.theme };
  const assetById = new Map(ctx.assets.map((a) => [a.id, a]));
  const find = (id: string) => blocks.findIndex((b) => b.id === id);

  for (const [i, op] of plan.ops.entries()) {
    const at = (msg: string) => errors.push(`Step ${i + 1} (${op.op}): ${msg}`);
    switch (op.op) {
      case "set_text": {
        const idx = find(op.blockId);
        if (idx < 0) { at(`no block ${op.blockId}`); break; }
        const field = op.path.split(".").pop()!;
        if (NON_TEXT_FIELDS.has(field)) { at(`'${field}' can't be set as text`); break; }
        const props = blocks[idx].props as Record<string, unknown>;
        if (!setPath(props, op.path, op.value)) { at(`'${op.path}' doesn't exist on this block`); break; }
        changedText.push(op.value);
        break;
      }
      case "set_image": {
        const idx = find(op.blockId);
        const asset = assetById.get(op.assetId);
        if (idx < 0 || !asset) { at("unknown block or image"); break; }
        if (!["hero", "about"].includes(blocks[idx].type as string)) { at("this block has no main image"); break; }
        (blocks[idx].props as Record<string, unknown>).image = asset.url;
        break;
      }
      case "add_block": {
        const idx = find(op.afterBlockId);
        if (idx < 0) { at(`no block ${op.afterBlockId}`); break; }
        if (op.type === "hero") { at("a site has exactly one hero"); break; }
        const block = { type: op.type, id: newBlockId(op.type), props: op.props };
        blocks.splice(idx + 1, 0, block);
        changedText.push(...collectStrings(op.props));
        break;
      }
      case "remove_block": {
        const idx = find(op.blockId);
        if (idx < 0) { at(`no block ${op.blockId}`); break; }
        const type = blocks[idx].type as string;
        if (REQUIRED_BLOCKS.includes(type as never) && blocks.filter((b) => b.type === type).length === 1) {
          at(`the ${type} section is required`);
          break;
        }
        blocks.splice(idx, 1);
        break;
      }
      case "move_block": {
        const from = find(op.blockId);
        if (from < 0 || find(op.afterBlockId) < 0) { at("unknown block"); break; }
        const [b] = blocks.splice(from, 1);
        blocks.splice(find(op.afterBlockId) + 1, 0, b);
        break;
      }
      case "set_list_item":
      case "remove_list_item": {
        const idx = find(op.blockId);
        const items = idx >= 0 ? ((blocks[idx].props as { items?: unknown[] }).items) : undefined;
        if (!items) { at("this block has no list"); break; }
        if (blocks[idx].type === "featured-listings" && op.op === "set_list_item") {
          at("listing details come from your listing data, not prompts");
          break;
        }
        if (op.op === "remove_list_item") { if (op.index < items.length) items.splice(op.index, 1); break; }
        if (op.index > items.length) { at("index out of range"); break; }
        items[op.index] = op.item;
        changedText.push(...collectStrings(op.item));
        break;
      }
      case "add_listing": {
        const idx = find(op.blockId);
        const asset = assetById.get(op.assetId);
        if (idx < 0 || blocks[idx].type !== "featured-listings" || !asset || asset.kind !== "listing") { at("needs a listings block and a listing photo"); break; }
        const items = (blocks[idx].props as { items: unknown[] }).items;
        items.push({ image: asset.url, address: asset.meta.address || "Address on request", price: asset.meta.price, status: (asset.meta.status as never) || "sold" });
        break;
      }
      case "set_theme": {
        const next = { ...theme, ...Object.fromEntries(Object.entries(op).filter(([k, v]) => k !== "op" && v !== undefined)) };
        const parsed = Theme.safeParse(next);
        if (!parsed.success) { at("that style option isn't available"); break; }
        if (!ctx.allowedPalettes.includes(parsed.data.palette)) { at(`'${parsed.data.palette}' isn't one of this template's palettes`); break; }
        theme = parsed.data;
        break;
      }
    }
  }

  // Structural validation of the whole result.
  const parsed = SiteContent.safeParse({ blocks });
  if (!parsed.success) errors.push(...parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "site"}: ${i.message}`));
  const content = parsed.success ? parsed.data : ctx.content;

  // Every image must be one we host for this site.
  if (parsed.success) {
    const allowed = new Set(ctx.assets.map((a) => a.url));
    const stray = imagesIn(content).filter((u) => !allowed.has(u) && !imagesIn(ctx.content).includes(u));
    if (stray.length) errors.push("Edits can only use images from your library.");
  }

  // Stats must be numbers the agent actually gave us.
  if (parsed.success) {
    for (const b of content.blocks) {
      if (b.type !== "stats") continue;
      for (const s of b.props.items) {
        if (!norm(ctx.knownFacts).includes(norm(s.value))) {
          errors.push(`Stat "${s.value}" isn't one you've given us. Add it under Profile → Claims first.`);
        }
      }
    }
  }

  // Copy lint on everything new.
  const warnings: Finding[] = [];
  for (const t of changedText) {
    for (const f of lintFairHousing(t)) {
      if (f.severity === "block") errors.push(`Fair Housing: ${f.message} ("${f.match}")`);
      else warnings.push(f);
    }
    warnings.push(...lintClaims(t, ctx.knownFacts));
  }

  return { ok: errors.length === 0, content, theme, errors, warnings: uniq(warnings), changedText };
}

function setPath(obj: Record<string, unknown>, path: string, value: string): boolean {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts.slice(0, -1)) {
    if (cur == null || typeof cur !== "object") return false;
    cur = Array.isArray(cur) ? cur[Number(p)] : (cur as Record<string, unknown>)[p];
  }
  const last = parts.at(-1)!;
  if (cur == null || typeof cur !== "object") return false;
  const target = cur as Record<string, unknown>;
  // Only overwrite existing string fields, or optional text fields the schema knows.
  if (!(last in target) && !["eyebrow", "intro"].includes(last)) return false;
  if (last in target && typeof target[last] !== "string") return false;
  target[last] = value;
  return true;
}

function collectStrings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(collectStrings);
  if (v && typeof v === "object") return Object.values(v).flatMap(collectStrings);
  return [];
}

const norm = (s: string) => s.toLowerCase().replace(/[\s,]+/g, "");
const uniq = (f: Finding[]) => f.filter((x, i) => f.findIndex((y) => y.match === x.match && y.rule === x.rule) === i);

/** Compact, id-tagged view of the page for the model. */
export function describeForModel(content: SiteContent): string {
  return JSON.stringify(content.blocks.map((b: Block) => ({ id: b.id, type: b.type, props: b.props })), null, 0);
}
