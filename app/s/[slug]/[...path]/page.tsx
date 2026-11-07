import { SubPage, subPageMetadata } from "@/components/site/pages/SubPage";
import { redirectOrNotFound } from "@/lib/redirects.server";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string; path: string[] }> };

// One segment is a site page (/buy). Anything deeper can only be an old-site URL to redirect.
export async function generateMetadata({ params }: Props) {
  const p = await params;
  return p.path.length === 1 ? subPageMetadata(p.slug, p.path[0]) : {};
}
export default async function Page({ params }: Props) {
  const p = await params;
  if (p.path.length !== 1) return redirectOrNotFound(p.slug, "/" + p.path.join("/"), false);
  return <SubPage slug={p.slug} pageSlug={p.path[0]} hosted={false} />;
}
