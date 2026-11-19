import Link from "next/link";
import { BRAND } from "./Brand";
import { MarketingFooter, MarketingFrame, MarketingHeader } from "./Chrome";
import { LEGAL } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

const label = "text-[12px] font-medium uppercase tracking-[0.18em]";
const serif = { fontFamily: BRAND.serif, fontWeight: 500, letterSpacing: "-0.01em" } as const;

/** Shared layout for the Terms and Privacy pages: title, short summary, contents, numbered sections. */
export function LegalPage({ eyebrow, title, summary, sections, other }: {
  eyebrow: string; title: string; summary: React.ReactNode; sections: LegalSection[]; other: { href: string; label: string };
}) {
  return (
    <MarketingFrame>
      <div id="top" />
      <MarketingHeader />
      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-10 sm:px-8 lg:pt-16">
        <p className={label} style={{ color: BRAND.taupe }}>{eyebrow}</p>
        <h1 className="mt-5 text-[3rem] leading-[0.95] sm:text-7xl" style={serif}>{title}<span style={{ color: BRAND.brass }}>.</span></h1>
        <p className="mt-6 text-[15px]" style={{ color: BRAND.taupe }}>Last updated {LEGAL.updated}</p>

        <div className="mt-12 grid gap-12 border-t pt-10 lg:grid-cols-[260px_minmax(0,1fr)]" style={{ borderColor: BRAND.evergreen }}>
          <nav aria-label="Contents" className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
            <p className={label} style={{ color: BRAND.taupe }}>contents</p>
            <ol className="mt-4 space-y-2 text-[15px]">
              {sections.map((s, i) => (
                <li key={s.id}><a href={`#${s.id}`} className="hover:underline"><span className="tabular-nums" style={{ color: BRAND.taupe }}>{i + 1}.</span> {s.title}</a></li>
              ))}
            </ol>
            <Link href={other.href} className="mt-8 inline-block text-[15px] font-semibold hover:underline">{other.label} →</Link>
          </nav>

          <div className="legal max-w-[720px] text-[17px] leading-relaxed" style={{ color: BRAND.ink }}>
            <div className="rounded p-6 sm:p-8" style={{ background: BRAND.sand + "80" }}>
              <p className={label} style={{ color: BRAND.evergreen }}>the short version</p>
              <div className="mt-4 space-y-3">{summary}</div>
              <p className="mt-4 text-[15px]" style={{ color: BRAND.taupe }}>This summary is here to help. The full text below is what applies.</p>
            </div>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-8 pt-12">
                <h2 className="text-3xl leading-tight sm:text-4xl" style={{ ...serif, color: BRAND.evergreen }}><span className="tabular-nums">{i + 1}.</span> {s.title}</h2>
                <div className="mt-4 space-y-4">{s.body}</div>
              </section>
            ))}
            <p className="mt-16 border-t pt-6 text-[15px]" style={{ borderColor: BRAND.sand, color: BRAND.taupe }}>
              Questions? Email <a href={`mailto:${LEGAL.email}`} className="underline">{LEGAL.email}</a>.
            </p>
          </div>
        </div>
      </main>
      <MarketingFooter />
      <style>{`.legal ul{list-style:disc;padding-left:1.25rem}.legal ul>li+li{margin-top:.4rem}.legal h3{font-weight:600;color:${BRAND.evergreen};margin-top:1.5rem}.legal a{text-decoration:underline;text-underline-offset:3px}.legal strong{color:${BRAND.evergreen};font-weight:600}`}</style>
    </MarketingFrame>
  );
}
