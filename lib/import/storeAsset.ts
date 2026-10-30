import { createAdminClient } from "../supabase/server";
import { safeFetch } from "./safeFetch";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
]);

function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(4, 12).toString().startsWith("ftypavi")) return "image/avif";
  if (buf.subarray(0, 3).toString() === "GIF") return "image/gif";
  return null;
}

/** Copies an image into our bucket. We never hot-link the agent's old site. */
export async function storeImage(siteId: string, body: Buffer, sourceUrl?: string) {
  const type = sniff(body);
  if (!type || !ALLOWED.has(type)) throw new Error("Unsupported image type");
  const admin = createAdminClient();
  const path = `${siteId}/${crypto.randomUUID()}.${ALLOWED.get(type)}`;
  const { error } = await admin.storage.from("site-assets").upload(path, body, { contentType: type, upsert: false });
  if (error) throw error;
  const { data } = admin.storage.from("site-assets").getPublicUrl(path);
  return { path, url: data.publicUrl, sourceUrl };
}

export async function importRemoteImage(siteId: string, url: string) {
  const res = await safeFetch(url, { maxBytes: 8_000_000, accept: "image/*" });
  return storeImage(siteId, res.body, res.url);
}
