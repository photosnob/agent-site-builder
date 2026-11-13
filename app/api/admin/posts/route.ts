import { fail, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  if (!(await requireAdmin())) return fail("Not found", 404);
  const { data } = await createAdminClient()
    .from("platform_posts")
    .select("id, slug, title, status, published_at, updated_at")
    .order("updated_at", { ascending: false });
  return json({ posts: data ?? [] });
}

/** Creates an empty draft and returns its id; the editor takes it from there. */
export async function POST() {
  if (!(await requireAdmin())) return fail("Not found", 404);
  const slug = `untitled-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await createAdminClient().from("platform_posts").insert({ slug }).select("id").single();
  if (error) return fail(error.message, 500);
  return json({ id: data.id });
}
