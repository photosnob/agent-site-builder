import { z } from "zod";
import type { SiteContent } from "@/lib/blocks/schema";
import type { Theme } from "@/lib/blocks/theme";
import type { TemplateId } from "@/lib/templates";
import type { SiteSeo } from "@/lib/seo/schema";

/** What the agent told us in onboarding. These are the only "facts" AI may state. */
export const AgentProfile = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional().default(""),
  brokerage: z.string().trim().min(2).max(120),
  licenseNumber: z.string().trim().min(3).max(40),
  licenseState: z.string().trim().length(2).toUpperCase(),
  serviceAreas: z.array(z.string().trim().min(2).max(60)).min(1).max(8),
  specialties: z.array(z.string().trim().max(40)).max(8).default([]),
  yearsExperience: z.number().int().min(0).max(70).optional(),
  /** Agent-stated production claims. Stats may only use these. */
  claims: z.array(z.object({ value: z.string().trim().max(20), label: z.string().trim().max(40) })).max(4).default([]),
  tone: z.enum(["warm", "polished", "bold"]).default("warm"),
  bio: z.string().trim().max(2000).optional().default(""),
  existingSiteUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
  /** One or two sentences for the blog's "About the author" box. */
  shortBio: z.string().trim().max(400).optional(),
  socials: z.object({
    instagram: z.string().trim().url().max(200).optional(),
    facebook: z.string().trim().url().max(200).optional(),
    linkedin: z.string().trim().url().max(200).optional(),
  }).optional(),
});
export type AgentProfile = z.infer<typeof AgentProfile>;

export interface SiteAsset {
  id: string;
  kind: "headshot" | "logo" | "listing" | "other";
  url: string;
  meta: { alt?: string; address?: string; price?: string; status?: string; originalUrl?: string; crop?: { cx: number; cy: number; zoom: number } };
}

export interface ImportData {
  /** The first site scanned (the agent's main site). */
  sourceUrl: string;
  /** Every site scanned during onboarding. */
  sourceUrls?: string[];
  bio?: string;
  testimonials?: { quote: string; author: string }[];
  specialties?: string[];
}

export interface SiteRow {
  id: string;
  owner_id: string;
  slug: string;
  status: "onboarding" | "draft" | "live" | "suspended";
  template: TemplateId | null;
  onboarding_step: number;
  agent: Partial<AgentProfile>;
  import_data: ImportData | null;
  theme: Theme | null;
  content: SiteContent | null;
  published_content: SiteContent | null;
  published_theme: Theme | null;
  custom_domain: string | null;
  published_at: string | null;
  seo: SiteSeo | null;
  ai_daily_edit_limit?: number | null;
}
