import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { TEMPLATES, type TemplateId } from "@/lib/templates";
import { z } from "zod";

const Patch = z.object({
  template: z.enum(Object.keys(TEMPLATES) as [TemplateId, ...TemplateId[]]).optional(),
  onboardingStep: z.number().int().min(1).max(6).optional(),
  importData: z.object({
    bio: z.string().max(2000).optional(),
    testimonials: z.array(z.object({ quote: z.string().max(450), author: z.string().max(60) })).max(6).optional(),
  }).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const body = Patch.safeParse(await req.json());
  if (!body.success) return fail("Invalid update", 422);

  const update: Record<string, unknown> = {};
  if (body.data.template) {
    update.template = body.data.template;
    update.theme = TEMPLATES[body.data.template].theme;
  }
  if (body.data.onboardingStep) update.onboarding_step = body.data.onboardingStep;
  if (body.data.importData) {
    // Keep only what the agent confirmed (they can uncheck scraped testimonials).
    update.import_data = { ...(ctx.site.import_data ?? {}), ...body.data.importData };
  }
  const { error } = await createAdminClient().from("sites").update(update).eq("id", ctx.site.id);
  if (error) return fail(error.message, 500);
  return json({ ok: true });
}
