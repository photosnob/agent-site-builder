import { z } from "zod";

/**
 * Blog posts are stored as editor JSON, never HTML. This schema is the
 * allowlist: anything the editor (or a hand-crafted request) sends that isn't
 * one of these node and mark types, or has a bad URL, is rejected on save.
 *
 * Headings in the body are H2–H4. The post title is the page's single H1.
 */

export const IMAGE_SIZES = ["small", "medium", "large", "full"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

const safeHref = z
  .string()
  .max(800)
  .refine((h) => /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(h.trim()), "Links must be http(s), mailto:, tel: or a relative path");

const Mark = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({ type: z.literal("underline") }),
  z.object({ type: z.literal("strike") }),
  z.object({ type: z.literal("code") }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({ href: safeHref }).passthrough(),
  }),
]);

const Text = z.object({ type: z.literal("text"), text: z.string().max(10000), marks: z.array(Mark).max(6).optional() });
const HardBreak = z.object({ type: z.literal("hardBreak") });
const Inline = z.union([Text, HardBreak]);
const inlineContent = z.array(Inline).max(2000).optional();

export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

const Block: z.ZodType<DocNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("paragraph"), attrs: z.record(z.string(), z.unknown()).optional(), content: inlineContent }),
    z.object({
      type: z.literal("heading"),
      attrs: z.object({ level: z.union([z.literal(2), z.literal(3), z.literal(4)]) }).passthrough(),
      content: inlineContent,
    }),
    z.object({ type: z.literal("bulletList"), content: z.array(ListItem).max(200) }),
    z.object({ type: z.literal("orderedList"), attrs: z.record(z.string(), z.unknown()).optional(), content: z.array(ListItem).max(200) }),
    z.object({ type: z.literal("blockquote"), content: z.array(Block).max(50) }),
    z.object({ type: z.literal("horizontalRule") }),
    z.object({
      type: z.literal("figure"),
      attrs: z.object({
        src: z.string().url().max(800),
        alt: z.string().max(300).nullable().optional(),
        size: z.enum(IMAGE_SIZES).nullable().optional(),
      }),
      content: inlineContent, // the caption
    }),
  ]) as z.ZodType<DocNode>,
);

const ListItem: z.ZodType<DocNode> = z.lazy(() => z.object({ type: z.literal("listItem"), content: z.array(Block).max(50) }) as z.ZodType<DocNode>);

export const PostDoc = z.object({ type: z.literal("doc"), content: z.array(Block).max(1500) });
export type PostDoc = z.infer<typeof PostDoc>;

export const EMPTY_DOC: PostDoc = { type: "doc", content: [] };

/** Validates a doc and checks every image is one this site hosts. */
export function validatePostDoc(input: unknown, allowedImagePrefix: string): { ok: true; doc: PostDoc } | { ok: false; error: string } {
  if (JSON.stringify(input ?? null).length > 600_000) return { ok: false, error: "This post is too long. Split it into two posts." };
  const parsed = PostDoc.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `The post contains something the editor doesn't support (${i.path.join(".")}: ${i.message}).` };
  }
  const stray = imagesInDoc(parsed.data).filter((src) => !src.startsWith(allowedImagePrefix));
  if (stray.length) return { ok: false, error: "Images must be uploaded through the editor." };
  return { ok: true, doc: parsed.data };
}

export function walk(node: DocNode, fn: (n: DocNode) => void) {
  fn(node);
  node.content?.forEach((c) => walk(c, fn));
}

export function imagesInDoc(doc: DocNode): string[] {
  const out: string[] = [];
  walk(doc, (n) => { if (n.type === "figure" && typeof n.attrs?.src === "string") out.push(n.attrs.src); });
  return out;
}

export function textOf(node: DocNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(textOf).join(node.type === "doc" ? "\n" : "");
}

/** All prose, one line per block, for linting and excerpts. */
export function plainText(doc: DocNode): string {
  const lines: string[] = [];
  walk(doc, (n) => { if (["paragraph", "heading", "figure"].includes(n.type)) lines.push(textOf(n)); });
  return lines.filter(Boolean).join("\n");
}

export interface TocEntry { id: string; text: string; level: 2 | 3 | 4 }

export function slugifyHeading(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60) || "section";
}

/** Heading ids are derived from the text at render time, de-duplicated in order. */
export function buildToc(doc: DocNode): TocEntry[] {
  const seen = new Map<string, number>();
  const toc: TocEntry[] = [];
  for (const n of doc.content ?? []) {
    if (n.type !== "heading") continue;
    const text = textOf(n).trim();
    if (!text) continue;
    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    toc.push({ id: count ? `${base}-${count + 1}` : base, text, level: n.attrs?.level as 2 | 3 | 4 });
  }
  return toc;
}

export function readingMinutes(doc: DocNode) {
  return Math.max(1, Math.round(plainText(doc).split(/\s+/).filter(Boolean).length / 225));
}

export function postSlug(title: string) {
  return title.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 70).replace(/-$/, "") || "post";
}
