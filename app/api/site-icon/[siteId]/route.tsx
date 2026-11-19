import { ImageResponse } from "next/og";
import { PALETTES } from "@/lib/blocks/theme";
import { createAdminClient } from "@/lib/supabase/server";
import { initials } from "@/lib/siteIcon";

const SIZE = 256;

/**
 * Fallback icon for an agent site that has no stored icon yet: the logo on a
 * white tile, or the agent's initials in the site's accent color. Public, cached.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return new Response("Not found", { status: 404 });
  const admin = createAdminClient();
  const { data: site } = await admin.from("sites").select("id, agent, published_theme, theme").eq("id", siteId).maybeSingle();
  if (!site) return new Response("Not found", { status: 404 });
  const { data: assets } = await admin.from("site_assets").select("kind, url").eq("site_id", siteId).in("kind", ["favicon", "logo"]);
  const cache = { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" };

  const stored = assets?.find((a) => a.kind === "favicon")?.url;
  if (stored) return Response.redirect(stored, 302);

  const logo = await logoDataUrl(assets?.find((a) => a.kind === "logo")?.url);
  if (logo) {
    return new ImageResponse(
      <div style={{ width: SIZE, height: SIZE, display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: SIZE * 0.22, padding: SIZE * 0.12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      </div>,
      { width: SIZE, height: SIZE, headers: cache },
    );
  }

  const theme = (site.published_theme ?? site.theme) as { palette?: keyof typeof PALETTES } | null;
  const p = PALETTES[theme?.palette ?? "ink"] ?? PALETTES.ink;
  const text = initials((site.agent as { name?: string } | null)?.name);
  return new ImageResponse(
    <div style={{ width: SIZE, height: SIZE, display: "flex", alignItems: "center", justifyContent: "center", background: p.accent, color: p.accentText, borderRadius: SIZE * 0.22, fontSize: text.length > 1 ? 118 : 150, fontWeight: 700, letterSpacing: -4 }}>
      {text}
    </div>,
    { width: SIZE, height: SIZE, headers: cache },
  );
}

/** The logo as a data URL (PNG or JPEG only), or null if it can't be loaded, so a bad logo falls back to initials. */
async function logoDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !["image/png", "image/jpeg"].includes(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 2_000_000 ? null : `data:${type};base64,${buf.toString("base64")}`;
  } catch { return null; }
}
