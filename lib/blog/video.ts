/**
 * Turns a YouTube or Vimeo page URL into a safe embed reference. We store only
 * the provider, the video id and a start time, never a URL or HTML, and build
 * the iframe URL ourselves at render time.
 */
export type VideoRef = { provider: "youtube" | "vimeo"; videoId: string; start?: number; hash?: string; vertical?: boolean };

export const YT_ID = /^[\w-]{11}$/;
export const VIMEO_ID = /^\d{4,12}$/;
export const VIMEO_HASH = /^[0-9a-f]{6,20}$/i;

export function parseVideoUrl(raw: string): VideoRef | null {
  let u: URL;
  try { u = new URL(raw.trim().replace(/^(?!https?:\/\/)/i, "https://")); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  const start = parseStart(u.searchParams.get("t") ?? u.searchParams.get("start") ?? u.hash.match(/t=([^&]+)/)?.[1] ?? null);

  if (host === "youtu.be") return yt(parts[0], start);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") return yt(u.searchParams.get("v"), start);
    if (["embed", "live", "v", "e"].includes(parts[0])) return yt(parts[1], start);
    if (parts[0] === "shorts") { const r = yt(parts[1], start); return r && { ...r, vertical: true }; }
    return null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    // vimeo.com/123, vimeo.com/123/abcdef (unlisted), vimeo.com/channels/x/123, player.vimeo.com/video/123?h=abcdef
    const i = parts.findIndex((p) => VIMEO_ID.test(p));
    if (i < 0) return null;
    const hash = u.searchParams.get("h") ?? parts[i + 1];
    return { provider: "vimeo", videoId: parts[i], ...(hash && VIMEO_HASH.test(hash) ? { hash } : {}), ...(start ? { start } : {}) };
  }
  return null;
}

function yt(id: string | null | undefined, start?: number): VideoRef | null {
  return id && YT_ID.test(id) ? { provider: "youtube", videoId: id, ...(start ? { start } : {}) } : null;
}

/** "90", "90s", "1m30s", "1h2m3s" → seconds. */
export function parseStart(t: string | null): number | undefined {
  if (!t) return undefined;
  if (/^\d+$/.test(t)) return Number(t) || undefined;
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || !m[0]) return undefined;
  return (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) || undefined;
}

export function embedUrl(v: VideoRef, autoplay = false): string {
  if (v.provider === "youtube") {
    const q = new URLSearchParams({ rel: "0", modestbranding: "1", ...(v.start ? { start: String(v.start) } : {}), ...(autoplay ? { autoplay: "1" } : {}) });
    return `https://www.youtube-nocookie.com/embed/${v.videoId}?${q}`;
  }
  const q = new URLSearchParams({ dnt: "1", ...(v.hash ? { h: v.hash } : {}), ...(autoplay ? { autoplay: "1" } : {}) });
  return `https://player.vimeo.com/video/${v.videoId}?${q}${v.start ? `#t=${v.start}s` : ""}`;
}

export function watchUrl(v: VideoRef): string {
  return v.provider === "youtube"
    ? `https://www.youtube.com/watch?v=${v.videoId}${v.start ? `&t=${v.start}s` : ""}`
    : `https://vimeo.com/${v.videoId}${v.hash ? `/${v.hash}` : ""}`;
}

export function thumbnailUrl(v: VideoRef): string | null {
  return v.provider === "youtube" ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : null;
}
