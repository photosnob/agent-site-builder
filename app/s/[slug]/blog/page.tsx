import { BlogIndexPage, blogIndexMetadata } from "@/components/site/pages/BlogPages";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return blogIndexMetadata((await params).slug, false);
}
export default async function Page({ params }: Props) {
  return <BlogIndexPage slug={(await params).slug} hosted={false} />;
}
