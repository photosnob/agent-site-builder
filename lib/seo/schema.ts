import { z } from "zod";

/** Agent-editable SEO overrides. Every field is optional; empty means "use the default". */
export const SiteSeo = z.object({
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(300).optional(),
  ogImage: z.string().url().max(800).optional(),
  noindex: z.boolean().optional(),
  // The content="" value from Google Search Console's HTML tag verification.
  googleVerification: z.string().trim().max(100).regex(/^[A-Za-z0-9_-]*$/, "Paste only the code inside content=\"…\"").optional(),
  // Custom llms.txt. Served as plain text; empty means auto-generate.
  llmsTxt: z.string().max(50_000).optional(),
});
export type SiteSeo = z.infer<typeof SiteSeo>;

export const TITLE_SOFT_LIMIT = 60;
export const DESCRIPTION_SOFT_LIMIT = 160;

/** Accepts either the bare code or the whole <meta …> tag Google gives you. */
export function extractVerificationCode(input: string) {
  const m = input.match(/content=["']([^"']+)["']/i);
  return (m ? m[1] : input).trim();
}

/** Strips control characters (except newlines/tabs) from uploaded text files. */
export function cleanPlainText(input: string) {
  return input.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}
