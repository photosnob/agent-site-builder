import { z } from "zod";
import { fail, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

/** Set (or clear, with null) one agent's daily AI edit limit. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return fail("Not found", 404);
  const { id } = await params;
  const body = z.object({ limit: z.number().int().min(0).max(10000).nullable() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Limit must be a whole number, or empty for the default", 422);
  const { error } = await createAdminClient().from("sites").update({ ai_daily_edit_limit: body.data.limit }).eq("id", id);
  if (error) return fail(error.message, 500);
  return json({ ok: true });
}
