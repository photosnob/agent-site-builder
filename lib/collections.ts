import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "./api";
import { siteImagePrefix } from "./blog/server";
import { lintFairHousing } from "./guardrails/fairHousing";
import { createAdminClient } from "./supabase/server";
import { revalidateSite } from "./siteUrls";

/**
 * Small CRUD factory for per-site collections (listings, reviews, team).
 * Every write is validated, images must be in the site's own storage, free
 * text is Fair Housing linted, and the live site is refreshed (these changes
 * apply immediately, like a CMS, rather than waiting for Publish).
 */
interface Def<C extends z.ZodObject> {
  table: string;
  create: C;
  imageFields?: string[];
  textFields?: string[];
  max?: number;
  pages?: string[];
}

const toSnake = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`), v]));

function check(def: Def<z.ZodObject>, data: Record<string, unknown>, prefix: string) {
  for (const f of def.imageFields ?? []) {
    const v = data[f];
    const urls = Array.isArray(v) ? v : v ? [v] : [];
    if (urls.some((u) => typeof u !== "string" || !u.startsWith(prefix))) return "Photos must be uploaded through the dashboard.";
  }
  const text = (def.textFields ?? []).map((f) => data[f]).filter((v) => typeof v === "string").join("\n");
  const blocking = text ? lintFairHousing(text).filter((x) => x.severity === "block") : [];
  if (blocking.length) return `Fair Housing: ${blocking[0].message} ("${blocking[0].match}")`;
  return null;
}

export function collectionRoutes<C extends z.ZodObject>(def: Def<C>) {
  const refresh = (slug: string) => revalidateSite(slug, "", "/blog", ...(def.pages ?? []).map((p) => `/${p}`));

  async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await ownedSiteOr404(params);
    if ("error" in ctx) return ctx.error;
    const { data, error } = await ctx.supabase.from(def.table).select("*").eq("site_id", ctx.site.id).order("position").order("created_at", { ascending: false });
    if (error) return fail("Couldn't load. Has the 0005 database migration been run?", 500);
    return json({ items: data ?? [] });
  }

  async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await ownedSiteOr404(params);
    if ("error" in ctx) return ctx.error;
    const body = def.create.safeParse(await req.json().catch(() => null));
    if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid", 422, { field: body.error.issues[0]?.path.join(".") });
    const err = check(def as unknown as Def<z.ZodObject>, body.data as Record<string, unknown>, siteImagePrefix(ctx.site.id));
    if (err) return fail(err, 422);
    const admin = createAdminClient();
    const { count } = await admin.from(def.table).select("id", { count: "exact", head: true }).eq("site_id", ctx.site.id);
    if ((count ?? 0) >= (def.max ?? 200)) return fail("Limit reached", 403);
    const { data, error } = await admin.from(def.table).insert({ ...toSnake(body.data as Record<string, unknown>), site_id: ctx.site.id, position: -(Date.now() % 1e9) }).select("*").single();
    if (error) return fail(error.message, 500);
    refresh(ctx.site.slug);
    return json({ item: data });
  }

  async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
    const { id, itemId } = await params;
    const ctx = await ownedSiteOr404(Promise.resolve({ id }));
    if ("error" in ctx) return ctx.error;
    const body = def.create.partial().extend({ position: z.number().int().optional() }).safeParse(await req.json().catch(() => null));
    if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid", 422);
    const err = check(def as unknown as Def<z.ZodObject>, body.data as Record<string, unknown>, siteImagePrefix(ctx.site.id));
    if (err) return fail(err, 422);
    const { data, error } = await createAdminClient().from(def.table).update(toSnake(body.data as Record<string, unknown>)).eq("id", itemId).eq("site_id", ctx.site.id).select("*").maybeSingle();
    if (error) return fail(error.message, 500);
    if (!data) return fail("Not found", 404);
    refresh(ctx.site.slug);
    return json({ item: data });
  }

  async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
    const { id, itemId } = await params;
    const ctx = await ownedSiteOr404(Promise.resolve({ id }));
    if ("error" in ctx) return ctx.error;
    await createAdminClient().from(def.table).delete().eq("id", itemId).eq("site_id", ctx.site.id);
    refresh(ctx.site.slug);
    return json({ ok: true });
  }

  return { list: { GET, POST }, item: { PATCH, DELETE } };
}

const text = (max: number) => z.string().trim().max(max).refine((s) => !/<[^>]+>|javascript:/i.test(s), "No markup, please");
const optText = (max: number) => text(max).nullable().optional().transform((v) => (v ? v : null));

export const ListingInput = z.object({
  address: text(160).pipe(z.string().min(3, "Add the address")),
  city: optText(80),
  price: optText(40),
  status: z.enum(["active", "pending", "sold", "coming-soon"]),
  beds: z.number().min(0).max(50).nullable().optional(),
  baths: z.number().min(0).max(50).nullable().optional(),
  sqft: z.number().int().min(0).max(200000).nullable().optional(),
  description: optText(2000),
  photos: z.array(z.string().url().max(800)).max(20),
  linkUrl: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  featured: z.boolean().optional(),
});

export const ReviewInput = z.object({
  quote: text(1500).pipe(z.string().min(5, "Add the review text")),
  author: text(80).pipe(z.string().min(1, "Add who wrote it")),
  context: optText(120),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  source: z.enum(["imported", "manual", "google", "zillow", "yelp", "other"]).optional(),
  visible: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export const TeamInput = z.object({
  name: text(80).pipe(z.string().min(2, "Add a name")),
  title: optText(80),
  photo: z.string().url().max(800).nullable().optional(),
  bio: optText(1500),
  email: z.string().trim().email().max(200).nullable().optional().or(z.literal("").transform(() => null)),
  phone: optText(40),
  license: optText(60),
});
