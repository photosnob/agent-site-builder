import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createMissingDefaultPages, listPages } from "@/lib/pages/server";

export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  return json({ pages: await listPages(ctx.site.id) });
}

/** Creates any missing default pages (Buy, Sell, Team, Success Stories). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  try {
    const created = await createMissingDefaultPages(ctx.site, ctx.user.id);
    return json({ created });
  } catch (e) {
    console.error(e);
    return fail("Couldn't create pages. Has the 0005 database migration been run?", 500);
  }
}
