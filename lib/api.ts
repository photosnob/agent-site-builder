import { NextResponse } from "next/server";
import { getOwnedSite } from "@/lib/auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: message, ...extra }, { status });

/** Route guard: signed-in owner of :id, or a 401/404 response. */
export async function ownedSiteOr404(params: Promise<{ id: string }>) {
  const { id } = await params;
  const ctx = await getOwnedSite(id);
  if (!ctx.user) return { error: fail("Sign in required", 401) } as const;
  if (!ctx.site) return { error: fail("Site not found", 404) } as const;
  return { ...ctx, site: ctx.site, user: ctx.user } as const;
}

export function slugify(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40) || "agent";
}
