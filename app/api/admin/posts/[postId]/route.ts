import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { validatePostDoc } from "@/lib/blog/content";
import { platformImagePrefix } from "@/lib/blog/platform";
import { createAdminClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ postId: string }> };

const Patch = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  slug: z.string().trim().regex(/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/, "Use lowercase letters, numbers and dashes").optional(),
  excerpt: z.string().trim().max(300).nullable().optional(),
  metaDescription: z.string().trim().max(160).nullable().optional(),
  seoTitle: z.string().trim().max(120).nullable().optional(),
  coverImage: z.string().url().max(800).nullable().optional(),
  content: z.unknown().optional(),
  showToc: z.boolean().optional(),
  status: z.enum(["draft", "published"]).optional(),
  acknowledgeWarnings: z.boolean().optional(),
});

async function load(params: Params["params"]) {
  if (!(await requireAdmin())) return { error: fail("Not found", 404) } as const;
  const { postId } = await params;
  const admin = createAdminClient();
  const { data: post } = await admin.from("platform_posts").select("*").eq("id", postId).maybeSingle();
  if (!post) return { error: fail("Post not found", 404) } as const;
  return { admin, post } as const;
}

function refresh(...slugs: string[]) {
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  for (const s of slugs) revalidatePath(`/blog/${s}`);
}

export async function GET(_req: Request, { params }: Params) {
  const ctx = await load(params);
  if ("error" in ctx) return ctx.error;
  return json({ post: ctx.post });
}

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await load(params);
  if ("error" in ctx) return ctx.error;
  const { admin, post } = ctx;
  const body = Patch.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid update", 422);
  const b = body.data;
  const prefix = platformImagePrefix();

  const update: Record<string, unknown> = {};
  if (b.title !== undefined) update.title = b.title;
  if (b.excerpt !== undefined) update.excerpt = b.excerpt || null;
  if (b.metaDescription !== undefined) update.meta_description = b.metaDescription || null;
  if (b.seoTitle !== undefined) update.seo_title = b.seoTitle || null;
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
    const { data: clash } = await admin.from("platform_posts").select("id").eq("slug", b.slug).neq("id", post.id).maybeSingle();
    if (clash) return fail("Another post already uses that URL", 409);
    update.slug = b.slug;
  }
  if (b.status !== undefined) {
    update.status = b.status;
    if (b.status === "published" && !post.published_at) update.published_at = new Date().toISOString();
  }

  const { data, error } = await admin.from("platform_posts").update(update).eq("id", post.id).select("*").single();
  if (error) return fail(error.message, 500);
  if (data.status === "published" || post.status === "published") refresh(post.slug, data.slug);
  return json({ post: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await load(params);
  if ("error" in ctx) return ctx.error;
  await ctx.admin.from("platform_posts").delete().eq("id", ctx.post.id);
  refresh(ctx.post.slug);
  return json({ ok: true });
}
