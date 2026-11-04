import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * AES-256-GCM for secrets we store (e.g. Instagram tokens). The key comes from
 * TOKEN_ENCRYPTION_KEY; if unset it's derived from the Supabase service role key,
 * which is already server-only. Set a dedicated key in production.
 */
function key() {
  const material = process.env.TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!material) throw new Error("No encryption key configured");
  return createHash("sha256").update(`porchlight:${material}`).digest();
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decrypt(token: string) {
  const [v, iv, tag, body] = token.split(".");
  if (v !== "v1") throw new Error("Unknown ciphertext version");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}

/** Signed, expiring values (OAuth state). */
export function sign(value: string, ttlSeconds = 600) {
  const payload = `${value}.${Math.floor(Date.now() / 1000) + ttlSeconds}`;
  return `${payload}.${createHmac("sha256", key()).update(payload).digest("base64url")}`;
}

export function verify(signed: string): string | null {
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const payload = signed.slice(0, i);
  const sig = Buffer.from(signed.slice(i + 1));
  const want = Buffer.from(createHmac("sha256", key()).update(payload).digest("base64url"));
  if (sig.length !== want.length || !timingSafeEqual(sig, want)) return null;
  const j = payload.lastIndexOf(".");
  if (Number(payload.slice(j + 1)) < Date.now() / 1000) return null;
  return payload.slice(0, j);
}
