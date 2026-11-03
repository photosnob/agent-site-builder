import { BlogPostPage, blogPostMetadata } from "@/components/site/pages/BlogPages";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string; post: string }> };

export async function generateMetadata({ params }: Props) {
  const p = await params;
  return blogPostMetadata(p.slug, p.post, false);
}
export default async function Page({ params }: Props) {
  const p = await params;
  return <BlogPostPage slug={p.slug} postSlug={p.post} hosted={false} />;
}
