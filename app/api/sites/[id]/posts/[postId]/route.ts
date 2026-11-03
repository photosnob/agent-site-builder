import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { plainText, validatePostDoc } from "@/lib/blog/content";
import { siteImagePrefix } from "@/lib/blog/server";
import { lintFairHousing } from "@/lib/guardrails/fairHousing";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidateSite } from "@/lib/siteUrls";

type Params = { params: Promise<{ id: string; postId: string }> };

const Patch = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  slug: z.string().trim().regex(/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/, "Use lowercase letters, numbers and dashes").optional(),
  excerpt: z.string().trim().max(300).nullable().optional(),
  metaDescription: z.string().trim().max(160).nullable().optional(),
  coverImage: z.string().url().max(800).nullable().optional(),
  content: z.unknown().optional(),
  showToc: z.boolean().optional(),
  status: z.enum(["draft", "published"]).optional(),
  acknowledgeWarnings: z.boolean().optional(),
});

async function load(params: Params["params"]) {
  const { id, postId } = await params;
  const ctx = await ownedSiteOr404(Promise.resolve({ id }));
  if ("error" in ctx) return { error: ctx.error } as const;
  const admin = createAdminClient();
  const { data: post } = await admin.from("blog_posts").select("*").eq("id", postId).eq("site_id", ctx.site.id).maybeSingle();
  if (!post) return { error: fail("Post not found", 404) } as const;
  return { ...ctx, admin, post } as const;
}

export async function GET(_req: Request, { params }: Params) {
  const ctx = await load(params);
  if ("error" in ctx) return ctx.error;
  return json({ post: ctx.post });
}

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await load(params);
  if ("error" in ctx) return ctx.error;
  const { site, admin, post } = ctx;
  const body = Patch.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid update", 422);
  const b = body.data;
  const prefix = siteImagePrefix(site.id);

  const update: Record<string, unknown> = {};
  if (b.title !== undefined) update.title = b.title;
  if (b.excerpt !== undefined) update.excerpt = b.excerpt || null;
  if (b.metaDescription !== undefined) update.meta_description = b.metaDescription || null;
  if (b.showToc !== undefined) update.show_toc = b.showToc;
  if (b.coverImage !== undefined) {
    if (b.coverImage && !b.coverImage.startsWith(prefix)) return fail("Cover image must be uploaded through the editor", 422);
    update.cover_image = b.coverImage;
  }
  if (b.content !== undefined) {
    const v = validatePostDoc(b.content, prefix);
    if (!v.ok) return fail(v.error, 422);
    update.content = v.doc;
  }
  if (b.slug !== undefined && b.slug !== post.slug) {
    const { data: clash } = await admin.from("blog_posts").select("id").eq("site_id", site.id).eq("slug", b.slug).neq("id", post.id).maybeSingle();
    if (clash) return fail("Another post already uses that URL", 409);
    update.slug = b.slug;
  }

  // Fair Housing check whenever the post is (or stays) published.
  const willBePublished = (b.status ?? post.status) === "published";
  if (willBePublished) {
    const text = [update.title ?? post.title, update.excerpt ?? post.excerpt ?? "", plainText((update.content ?? post.content) as never)].join("\n");
    const findings = lintFairHousing(text);
    const blocking = findings.filter((f) => f.severity === "block");
    if (blocking.length) return fail("This post can't be published as written.", 422, { findings: blocking });
    if (findings.length && !b.acknowledgeWarnings) return fail("Please review the flagged phrases first.", 422, { findings, needsAck: true });
  }
  if (b.status !== undefined) {
    update.status = b.status;
    if (b.status === "published" && !post.published_at) update.published_at = new Date().toISOString();
  }

  const { data, error } = await admin.from("blog_posts").update(update).eq("id", post.id).select("*").single();
  if (error) return fail(error.message, 500);

  if (willBePublished || post.status === "published") {
    revalidateSite(site.slug, "", "/blog", `/blog/${post.slug}`, `/blog/${data.slug}`);
  }
  return json({ post: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await load(params);
  if ("error" in ctx) return ctx.error;
  await ctx.admin.from("blog_posts").delete().eq("id", ctx.post.id);
  revalidateSite(ctx.site.slug, "", "/blog", `/blog/${ctx.post.slug}`);
  return json({ ok: true });
}
