import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/siteUrls";

/** robots.txt for the app's own domain. Agent sites on subdomains get their own (app/h/[slug]/robots.txt). */
export default function robots(): MetadataRoute.Robots {
  const app = appUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/preview", "/onboarding", "/auth/", "/h/", "/reset-password"] }],
    sitemap: app ? `${app}/sitemap.xml` : undefined,
  };
}
