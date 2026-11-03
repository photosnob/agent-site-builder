import { fail, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { AiSettings, saveAiSettings } from "@/lib/ai/usage";

export async function POST(req: Request) {
  if (!(await requireAdmin())) return fail("Not found", 404);
  const body = AiSettings.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid settings", 422);
  try { new Intl.DateTimeFormat("en-US", { timeZone: body.data.timezone }); } catch { return fail("Unknown time zone", 422); }
  await saveAiSettings(body.data);
  return json({ ok: true });
}
