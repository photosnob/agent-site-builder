import { createAdminClient } from "./supabase/server";
import { decrypt, encrypt } from "./crypto";
import { appUrl } from "./siteUrls";

/**
 * Business Login for Instagram (Instagram API with Instagram Login).
 * Agents with a Business or Creator account connect once; we keep a 60-day
 * token (encrypted), refresh it automatically, and cache recent posts.
 */
export const instagramConfigured = () => Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
export const redirectUri = () => `${appUrl()}/api/instagram/callback`;

export interface IgPost { id: string; caption?: string; media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM"; media_url?: string; thumbnail_url?: string; permalink: string; timestamp: string }

export function authorizeUrl(state: string) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!);
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "instagram_business_basic");
  u.searchParams.set("state", state);
  return u.toString();
}

async function igJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.error?.message || data.error_message || data.error_description || `HTTP ${res.status}`;
    throw new Error(`Instagram: ${msg}`);
  }
  return data;
}

/** Code → short-lived token → long-lived (60-day) token, plus the account's username. */
export async function exchangeCode(code: string) {
  const form = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code,
  });
  const short = await igJson(await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form, signal: AbortSignal.timeout(15_000) }));
  const first = Array.isArray(short.data) ? short.data[0] : short; // response is { data: [{ access_token, user_id, permissions }] }
  const longUrl = new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", process.env.INSTAGRAM_APP_SECRET!);
  longUrl.searchParams.set("access_token", first.access_token);
  const long = await igJson(await fetch(longUrl, { signal: AbortSignal.timeout(15_000) }));
  const me = await igJson(await fetch(`https://graph.instagram.com/me?fields=user_id,username&access_token=${encodeURIComponent(long.access_token)}`, { signal: AbortSignal.timeout(15_000) }));
  return { token: long.access_token as string, expiresIn: Number(long.expires_in ?? 5_184_000), userId: String(me.user_id ?? first.user_id), username: me.username as string | undefined };
}

export async function saveConnection(siteId: string, c: Awaited<ReturnType<typeof exchangeCode>>) {
  await createAdminClient().from("instagram_connections").upsert({
    site_id: siteId,
    ig_user_id: c.userId,
    username: c.username ?? null,
    token_enc: encrypt(c.token),
    expires_at: new Date(Date.now() + c.expiresIn * 1000).toISOString(),
    media: [],
    media_cached_at: null,
    last_error: null,
  });
}

const MEDIA_TTL_MS = 60 * 60 * 1000;

/** Recent posts for a site (cached for an hour; refreshes the token when it's within 10 days of expiring). */
export async function getInstagramPosts(siteId: string): Promise<{ username: string | null; posts: IgPost[] } | null> {
  const admin = createAdminClient();
  let row;
  try {
    const { data, error } = await admin.from("instagram_connections").select("*").eq("site_id", siteId).maybeSingle();
    if (error || !data) return null;
    row = data;
  } catch { return null; }

  const cached = (row.media ?? []) as IgPost[];
  if (row.media_cached_at && Date.now() - new Date(row.media_cached_at).getTime() < MEDIA_TTL_MS) return { username: row.username, posts: cached };
  if (new Date(row.expires_at).getTime() < Date.now()) return { username: row.username, posts: cached }; // expired: agent must reconnect

  try {
    let token = decrypt(row.token_enc);
    const update: Record<string, unknown> = {};
    if (new Date(row.expires_at).getTime() - Date.now() < 10 * 86_400_000) {
      const r = await igJson(await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(10_000) }));
      token = r.access_token;
      update.token_enc = encrypt(token);
      update.expires_at = new Date(Date.now() + Number(r.expires_in ?? 5_184_000) * 1000).toISOString();
    }
    const m = await igJson(await fetch(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=12&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(10_000) }));
    const posts = ((m.data ?? []) as IgPost[]).filter((p) => p.permalink && (p.media_url || p.thumbnail_url)).slice(0, 12);
    await admin.from("instagram_connections").update({ ...update, media: posts, media_cached_at: new Date().toISOString(), last_error: null }).eq("site_id", siteId);
    return { username: row.username, posts };
  } catch (e) {
    console.error("[instagram]", (e as Error).message);
    await admin.from("instagram_connections").update({ last_error: (e as Error).message.slice(0, 300), media_cached_at: new Date().toISOString() }).eq("site_id", siteId);
    return { username: row.username, posts: cached };
  }
}

export const igImage = (p: IgPost) => (p.media_type === "VIDEO" ? p.thumbnail_url : p.media_url) ?? p.thumbnail_url ?? "";
export const _test = { authorizeUrl };
