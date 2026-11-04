import { fail, json } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { after } from "next/server";
import { leadEmail, sendEmail } from "@/lib/email";
import { appUrl, publicSiteUrl } from "@/lib/siteUrls";

const Lead = z.object({
  siteId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  intent: z.enum(["contact", "valuation", "listing"]).default("contact"),
  pagePath: z.string().max(300).optional(),
  website: z.string().optional().nullable(), // honeypot
});

// Naive in-memory limiter (per instance). Swap for Upstash/Vercel KV + Turnstile in production.
const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 5) return fail("Too many submissions", 429);
  hits.set(ip, [...recent, now]);

  const body = Lead.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid submission", 422);
  if (body.data.website) return json({ ok: true }); // bot: pretend success

  const admin = createAdminClient();
  const { data: site } = await admin.from("sites").select("id, slug, owner_id, agent").eq("id", body.data.siteId).eq("status", "live").maybeSingle();
  if (!site) return fail("Unknown site", 404);

  const { siteId, pagePath, website: _hp, ...rest } = body.data;
  const { error } = await admin.from("leads").insert({ site_id: siteId, page_path: pagePath, ...rest });
  if (error) return fail("Could not save", 500);

  // Email the agent after responding, so the visitor isn't kept waiting.
  after(async () => {
    try {
      const agent = (site.agent ?? {}) as { name?: string; email?: string };
      let to = agent.email;
      if (!to) to = (await admin.auth.admin.getUserById(site.owner_id)).data.user?.email ?? undefined;
      if (!to) return;
      const live = publicSiteUrl(site.slug);
      const msg = leadEmail(
        { name: rest.name, email: rest.email, phone: rest.phone, message: rest.message, intent: rest.intent, pagePath },
        { agentName: agent.name, siteUrl: live.startsWith("/") ? `${appUrl()}${live}` : live, dashboardUrl: `${appUrl()}/dashboard` },
      );
      await sendEmail({ to, replyTo: rest.email, ...msg });
    } catch (e) {
      console.error("[email] lead notification failed", e);
    }
  });
  return json({ ok: true });
}
