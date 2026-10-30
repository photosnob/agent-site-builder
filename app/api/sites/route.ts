import { requireUser } from "@/lib/auth";
import { fail, json, slugify } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { AgentProfile } from "@/lib/types";

const RESERVED = new Set(["www", "app", "api", "admin", "dashboard", "login", "signup", "help", "mail", "status"]);

/** Step 1–2 of onboarding: create the site with the agent's profile. */
export async function POST(req: Request) {
  const { user } = await requireUser();
  if (!user) return fail("Sign in required", 401);

  const parsed = AgentProfile.safeParse(await req.json());
  if (!parsed.success) return fail("Please check the highlighted fields", 422, { issues: parsed.error.issues });

  const admin = createAdminClient();
  const { data: existing } = await admin.from("sites").select("id").eq("owner_id", user.id).maybeSingle();
  if (existing) {
    await admin.from("sites").update({ agent: parsed.data, onboarding_step: 3 }).eq("id", existing.id);
    return json({ id: existing.id });
  }

  // Find a free slug: jane-doe, jane-doe-2, ...
  const base = slugify(parsed.data.name);
  let slug = RESERVED.has(base) ? `${base}-agent` : base;
  for (let n = 2; n < 50; n++) {
    const { data } = await admin.from("sites").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
  }
  const { data, error } = await admin
    .from("sites")
    .insert({ owner_id: user.id, slug, agent: parsed.data, onboarding_step: 3 })
    .select("id")
    .single();
  if (error) return fail(error.message, 500);
  return json({ id: data.id });
}
