import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const { data } = await ctx.supabase
    .from("blog_posts")
    .select("id, slug, title, status, published_at, updated_at")
    .eq("site_id", ctx.site.id)
    .order("updated_at", { ascending: false });
  return json({ posts: data ?? [] });
}

/** Creates an empty draft and returns its id; the editor takes it from there. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const admin = createAdminClient();
  const { count } = await admin.from("blog_posts").select("id", { count: "exact", head: true }).eq("site_id", ctx.site.id);
  if ((count ?? 0) >= 500) return fail("Post limit reached", 403);
  const slug = `untitled-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await admin.from("blog_posts").insert({ site_id: ctx.site.id, slug }).select("id").single();
  if (error) return fail(error.message, 500);
  return json({ id: data.id });
}
