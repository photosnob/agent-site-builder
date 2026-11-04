import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { outputSchema, stripNulls } from "../lib/ai/claude";
import { ModelEditPlan, fromModelPlan } from "../lib/guardrails/ops";

/** Every object in a strict schema must list its properties (no open-ended records). */
function openObjects(node: unknown, path = "$"): string[] {
  if (!node || typeof node !== "object") return [];
  const n = node as Record<string, unknown>;
  const out: string[] = [];
  if (n.type === "object" && Object.keys((n.properties as object) ?? {}).length === 0) out.push(path);
  for (const [k, v] of Object.entries(n)) {
    if (Array.isArray(v)) v.forEach((x, i) => out.push(...openObjects(x, `${path}.${k}[${i}]`)));
    else if (v && typeof v === "object") out.push(...openObjects(v, `${path}.${k}`));
  }
  return out;
}

test("schemas sent to Claude have no open-ended objects", async () => {
  // Same shapes as generate.ts (Copy) and scrape.ts (Extracted).
  const Copy = z.object({ hero: z.object({ eyebrow: z.string().max(60), headline: z.string() }), neighborhoods: z.object({ blurbs: z.array(z.string()).max(8) }) });
  const Extracted = z.object({ bio: z.string(), testimonials: z.array(z.object({ quote: z.string(), author: z.string() })), specialties: z.array(z.string()) });
  for (const [name, s] of Object.entries({ ModelEditPlan, Copy, Extracted })) {
    assert.deepEqual(openObjects(outputSchema(s)), [], `${name} has open-ended objects`);
  }
  const json = JSON.stringify(outputSchema(ModelEditPlan));
  assert.ok(!json.includes('"oneOf"'), "strict mode uses anyOf");
  assert.ok(json.includes("propsJson") && json.includes("itemJson"));
});

test("model plans convert, and bad JSON becomes an error instead of an edit", () => {
  const ok = fromModelPlan({ summary: "s", ops: [
    { op: "set_text", blockId: "hero-aaaa", path: "headline", value: "Hi" },
    { op: "add_block", type: "cta", afterBlockId: "hero-aaaa", propsJson: '{"headline":"Sell","body":"b","buttonLabel":"Go","target":"valuation"}' },
  ] } as ModelEditPlan);
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.plan.ops[1].op === "add_block" && (ok.plan.ops[1].props as { headline: string }).headline, "Sell");
  const bad = fromModelPlan({ summary: "s", ops: [{ op: "add_block", type: "cta", afterBlockId: "x", propsJson: "not json" }] } as ModelEditPlan);
  assert.equal(bad.plan.ops.length, 0);
  assert.equal(bad.errors.length, 1);
});

test("null optional fields are treated as missing", () => {
  assert.deepEqual(stripNulls({ summary: "x", refusal: null, ops: [{ a: 1, b: null }] }), { summary: "x", ops: [{ a: 1 }] });
});
