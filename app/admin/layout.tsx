import { PlatformAnalytics } from "@/components/PlatformAnalytics";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}<PlatformAnalytics /></>;
}
