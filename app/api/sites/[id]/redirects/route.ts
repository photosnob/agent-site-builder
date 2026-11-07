import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizePath, normalizeTarget, parseBulk } from "@/lib/redirects";
import { refreshRedirectPaths, siteDestinations } from "@/lib/redirects.server";

const MAX = 2000;

/** List redirects, plus the pages they can point to. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const { data, error } = await ctx.supabase.from("site_redirects").select("*").eq("site_id", ctx.site.id).order("needs_review", { ascending: false }).order("from_path");
  if (error) return fail("Couldn't load redirects. Has the 0007 database migration been run?", 500);
  const { dests, livePaths } = await siteDestinations(ctx.site.id);
  return json({
    items: (data ?? []).map((r) => ({ ...r, shadowed: livePaths.has(r.from_path) })),
    destinations: dests.map(({ path, label }) => ({ path, label })),
  });
}

const Item = z.object({ from: z.string().max(1000), to: z.string().max(1000), permanent: z.boolean().default(true) });
const Body = z.object({ items: z.array(Item).max(MAX).optional(), bulk: z.string().max(200_000).optional() });

/** Add or replace redirects: { items: [{from, to}] } or { bulk: "old → new" lines }. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return fail("Invalid redirects", 422);
  const raw = [...(b.data.items ?? []), ...parseBulk(b.data.bulk ?? "").map((x) => ({ ...x, permanent: true }))];
  const rows: { site_id: string; from_path: string; to_path: string; permanent: boolean; source: string; needs_review: boolean }[] = [];
  const errors: string[] = [];
  for (const r of raw) {
    const from = normalizePath(r.from), to = normalizeTarget(r.to);
    if (!from) { errors.push(`"${r.from}": not a valid old URL (the home page can't be redirected)`); continue; }
    if (!to) { errors.push(`"${r.to}": not a valid destination`); continue; }
    if (normalizePath(to.split("#")[0]) === from) { errors.push(`"${r.from}" would redirect to itself`); continue; }
    rows.push({ site_id: ctx.site.id, from_path: from, to_path: to, permanent: r.permanent, source: b.data.bulk ? "import" : "manual", needs_review: false });
  }
  if (!rows.length) return fail(errors[0] ?? "Nothing to add", 422, { errors });
  const admin = createAdminClient();
  const { count } = await admin.from("site_redirects").select("id", { count: "exact", head: true }).eq("site_id", ctx.site.id);
  if ((count ?? 0) + rows.length > MAX) return fail(`Up to ${MAX} redirects per site`, 403);
  const unique = [...new Map(rows.map((r) => [r.from_path, r])).values()];
  const { error } = await admin.from("site_redirects").upsert(unique, { onConflict: "site_id,from_path" });
  if (error) return fail(error.message, 500);
  refreshRedirectPaths(ctx.site.slug, unique.map((r) => r.from_path));
  return json({ saved: unique.length, errors });
}

const Patch = z.object({ id: z.string().uuid(), to: z.string().max(1000).optional(), permanent: z.boolean().optional(), reviewed: z.literal(true).optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const b = Patch.safeParse(await req.json().catch(() => null));
  if (!b.success) return fail("Invalid", 422);
  const admin = createAdminClient();
  const { data: row } = await admin.from("site_redirects").select("from_path").eq("id", b.data.id).eq("site_id", ctx.site.id).maybeSingle();
  if (!row) return fail("Not found", 404);
  const update: Record<string, unknown> = {};
  if (b.data.to !== undefined) {
    const to = normalizeTarget(b.data.to);
    if (!to) return fail("Not a valid destination", 422);
    if (normalizePath(to.split("#")[0]) === row.from_path) return fail("A page can't redirect to itself", 422);
    update.to_path = to; update.needs_review = false;
  }
  if (b.data.permanent !== undefined) update.permanent = b.data.permanent;
  if (b.data.reviewed) update.needs_review = false;
  const { data, error } = await admin.from("site_redirects").update(update).eq("id", b.data.id).select("*").single();
  if (error) return fail(error.message, 500);
  refreshRedirectPaths(ctx.site.slug, [row.from_path]);
  return json({ item: data });
}

const Del = z.object({ ids: z.array(z.string().uuid()).min(1).max(MAX) });

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const b = Del.safeParse(await req.json().catch(() => null));
  if (!b.success) return fail("Invalid", 422);
  const admin = createAdminClient();
  const { data } = await admin.from("site_redirects").delete().eq("site_id", ctx.site.id).in("id", b.data.ids).select("from_path");
  refreshRedirectPaths(ctx.site.slug, (data ?? []).map((r) => r.from_path as string));
  return json({ deleted: data?.length ?? 0 });
}
