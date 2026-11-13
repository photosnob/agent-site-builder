import Link from "next/link";
import { BRAND, BrandFonts, Logo, Wordmark } from "./Brand";
import { AccountButton } from "./AccountButton";

/** Shared page frame for launchandlist.com pages (home, blog): fonts, colors, header, footer. */
export function MarketingFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: BRAND.ivory, color: BRAND.evergreen, fontFamily: BRAND.sans }}>
      <BrandFonts />
      <style>{`.ll a:focus-visible,.ll button:focus-visible,.ll input:focus-visible{outline:2px solid ${BRAND.evergreen};outline-offset:3px}`}</style>
      <div className="ll">{children}</div>
    </div>
  );
}

const NAV = [
  ["/#features", "features."],
  ["/#how", "how it works."],
  ["/#templates", "templates."],
  ["/#pricing", "pricing."],
  ["/blog", "blog."],
] as const;

export function MarketingHeader() {
  return (
    <header className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
      <Link href="/" aria-label="Launch and List home"><Logo size={24} /></Link>
      <nav aria-label="Main" className="hidden gap-7 text-[15px] font-medium md:flex">
        {NAV.map(([href, label]) => <Link key={href} href={href} className="hover:opacity-70">{label}</Link>)}
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/blog" className="px-2 py-3 text-[15px] font-medium hover:opacity-70 md:hidden">blog.</Link>
        <AccountButton />
        <Link href="/signup" className="rounded-[2px] px-5 py-3 text-[15px] font-semibold" style={{ background: BRAND.evergreen, color: BRAND.ivory }}>launch my site.</Link>
      </div>
    </header>
  );
}

export function MarketingFooter({ topHref = "#top" }: { topHref?: string }) {
  return (
    <footer className="border-t" style={{ borderColor: BRAND.sand }}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-5 py-10 text-sm sm:px-8" style={{ color: BRAND.taupe }}>
        <Wordmark size={20} />
        <nav aria-label="Footer" className="flex flex-wrap gap-6">
          <Link href="/#features" className="hover:underline">features.</Link>
          <Link href="/#pricing" className="hover:underline">pricing.</Link>
          <Link href="/blog" className="hover:underline">blog.</Link>
          <Link href="/login" className="hover:underline">sign in.</Link>
        </nav>
        <a href={topHref} className="hover:underline">back to top ↑</a>
      </div>
    </footer>
  );
}
