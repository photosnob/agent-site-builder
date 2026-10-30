import { createClient } from "@/lib/supabase/server";
import type { SiteRow } from "@/lib/types";

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Loads a site only if the signed-in user owns it (enforced by RLS too). */
export async function getOwnedSite(siteId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { user: null, site: null, supabase };
  const { data } = await supabase.from("sites").select("*").eq("id", siteId).eq("owner_id", user.id).maybeSingle();
  return { user, site: (data as SiteRow | null) ?? null, supabase };
}
