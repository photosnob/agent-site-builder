import { HomePage, homeMetadata } from "@/components/site/pages/HomePage";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  return homeMetadata((await params).slug, true);
}
export default async function Page({ params }: Props) {
  return <HomePage slug={(await params).slug} hosted={true} />;
}
