import { siteIconMetadata } from "@/lib/siteIcon";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

/** Every page of an agent's site uses that agent's icon instead of Launch & List's. */
export async function generateMetadata({ params }: Props) {
  return siteIconMetadata((await params).slug);
}

export default function SiteLayout({ children }: Props) {
  return children;
}
