import Link from "next/link";
import { BrandFonts, Wordmark } from "@/components/marketing/Brand";
import { ProfileMenu } from "./ProfileMenu";

const LINKS = [
  { href: "/dashboard", label: "Site" },
  { href: "/dashboard/listings", label: "Listings" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/dashboard/blog", label: "Blog" },
  { href: "/dashboard/settings", label: "Settings" },
];

/** Top navigation shared by every dashboard screen. */
export function DashNav({ active, liveUrl, right }: { active: string; liveUrl?: string | null; right?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-2.5">
      <div className="flex min-w-0 items-center gap-1">
        <BrandFonts />
        <Link href="/dashboard" className="mr-3" aria-label="Launch and List dashboard"><Wordmark size={22} /></Link>
        <nav className="flex flex-wrap gap-0.5 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`rounded-md px-3 py-1.5 ${active === l.href ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>{l.label}</Link>
          ))}
        </nav>
        {liveUrl && <a href={liveUrl} target="_blank" className="ml-2 text-sm text-stone-500 underline">View live site ↗</a>}
      </div>
      <div className="flex items-center gap-2">
        {right}
        <ProfileMenu links={[{ href: "/dashboard/settings", label: "Settings" }]} />
      </div>
    </header>
  );
}
