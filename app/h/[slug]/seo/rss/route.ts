import { rssXml } from "@/lib/seo/files";
import { loadSeoSite, textResponse } from "@/lib/seo/load";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { seoSite, posts } = await loadSeoSite((await params).slug);
  return textResponse(rssXml(seoSite, posts), "application/rss+xml");
}
