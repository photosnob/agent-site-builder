import { SubPage, subPageMetadata } from "@/components/site/pages/SubPage";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string; page: string }> };

export async function generateMetadata({ params }: Props) {
  const p = await params;
  return subPageMetadata(p.slug, p.page);
}
export default async function Page({ params }: Props) {
  const p = await params;
  return <SubPage slug={p.slug} pageSlug={p.page} hosted={false} />;
}
