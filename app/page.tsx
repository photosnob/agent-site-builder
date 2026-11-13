import Link from "next/link";
import { BRAND, BrandFonts } from "@/components/marketing/Brand";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/Chrome";
import { TemplateThumb } from "@/components/app/TemplateThumb";
import { TEMPLATE_LIST } from "@/lib/templates";

// Early access is free for a limited time. Bring back a price here once payments are connected.
const OFFER = "free during early access";

const label = "text-[12px] font-medium uppercase tracking-[0.18em]";
const serif = { fontFamily: BRAND.serif, fontWeight: 500, letterSpacing: "-0.01em" } as const;
const h2 = "text-[2.6rem] leading-[0.98] sm:text-6xl lg:text-[4.5rem]";

const FEATURES = [
  {
    n: "01", title: "Launch fast.", lead: "Go from sign-up to a polished site the same day.",
    items: [
      ["Live in minutes", "Answer a few questions and get a complete site built around your market and brokerage."],
      ["Brings over what you have", "Paste your current site. We import your headshot, bio and listings, so you never start from blank."],
      ["Templates made for agents", "Modern designs built for real estate, already filled with your content."],
      ["Fast on every device", "Clean, modern sites that load quickly and look sharp on phones, where most buyers browse."],
    ],
  },
  {
    n: "02", title: "Edit by asking.", lead: "If you can send a text, you can update your website.",
    items: [
      ["Type it, see it", "“Add my new listing on Oak St.” “Swap my headshot.” Changes show up right away."],
      ["No clunky editor", "Skip the drag-and-drop builders, plugins and settings menus of Wix, WordPress and Squarespace."],
      ["Guardrails built in", "Every edit stays on-brand and on-layout, so your site never ends up looking broken."],
      ["No developer needed", "No waiting on a web person or paying for small changes. Make them yourself, any time."],
    ],
  },
  {
    n: "03", title: "Keep it fresh.", lead: "No more launching a site you don’t touch for three years.",
    items: [
      ["Update listings in seconds", "Add new listings, mark homes sold and refresh your bio as fast as your business moves."],
      ["A site that shows you’re active", "Buyers and sellers notice a current site. Keep yours as up to date as your Instagram."],
    ],
  },
] as const;

const STEPS = [
  ["01", "Sign up", "Tell us your market, your brokerage and the clients you want."],
  ["02", "Import", "Paste your current site. We bring over your headshot, bio and listings."],
  ["03", "Pick a template", "Start from a design made for agents, already filled with your content."],
  ["04", "Ask for changes", "Type what you want changed. Publish to your domain when it’s right."],
] as const;

function Check() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="mt-0.5 shrink-0"><path d="M4 10.5 L8 14 L16 6" fill="none" stroke={BRAND.evergreen} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: BRAND.ivory, color: BRAND.evergreen, fontFamily: BRAND.sans }}>
      <BrandFonts />
      <style>{`.ll a:focus-visible,.ll button:focus-visible,.ll input:focus-visible{outline:2px solid ${BRAND.evergreen};outline-offset:3px}`}</style>
      <div className="ll">
        <MarketingHeader />

        <section id="signup" className="mx-auto grid max-w-[1280px] items-center gap-14 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-2 lg:pt-16">
          <div className="flex flex-col gap-7">
            <p className={label} style={{ color: BRAND.taupe }}>websites for real estate agents</p>
            <h1 className="text-[3.25rem] leading-[0.92] sm:text-7xl xl:text-[6.5rem]" style={serif}>
              A website that moves as fast as your market<span style={{ color: BRAND.brass }}>.</span>
            </h1>
            <p className="max-w-[520px] text-[19px] leading-normal" style={{ color: BRAND.ink }}>
              Get a modern, fast agent website in minutes, then keep it current by typing what you want changed. No Wix, WordPress or Squarespace editor to wrestle with.
            </p>
            <form action="/signup" method="get" className="flex max-w-[540px] flex-wrap gap-2.5">
              <label htmlFor="hero-email" className="sr-only">Work email</label>
              <input id="hero-email" name="email" type="email" autoComplete="email" placeholder="you@yourbrokerage.com"
                className="min-h-14 flex-[1_1_260px] rounded-[2px] border bg-white px-6 text-base outline-none" style={{ borderColor: "#C9BFAE", color: BRAND.evergreen }} />
              <button type="submit" className="min-h-14 rounded-[2px] px-7 text-base font-bold" style={{ background: BRAND.brass, color: BRAND.evergreen }}>launch my site.</button>
            </form>
            <p className={label} style={{ color: BRAND.taupe }}>{OFFER} · no credit card needed</p>
          </div>

          {/* Illustration of an agent site being edited by prompt. */}
          <div aria-hidden className="overflow-hidden rounded border bg-white" style={{ borderColor: BRAND.sand, boxShadow: "0 30px 60px -30px rgba(17,17,16,.35)" }}>
            <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: BRAND.sand }}>
              {[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: BRAND.sand }} />)}
              <span className={`ml-3 ${label}`} style={{ color: BRAND.taupe }}>yourname.com</span>
            </div>
            <div className="flex items-center gap-6 px-6 py-10 sm:px-8" style={{ background: "#1E2A2B", color: BRAND.ivory }}>
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-[10px] uppercase tracking-[0.18em] sm:h-24 sm:w-24" style={{ background: "#3B4A4B", color: "#C9CFCF" }}>headshot</div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#C9CFCF" }}>your brokerage</span>
                <span className="text-[32px] leading-none" style={serif}>Your Name</span>
                <span className="text-sm" style={{ color: "#C9CFCF" }}>Homes in your market</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-5">
              {["#EDE5D8", BRAND.sand, "#EDE5D8"].map((c, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="aspect-[4/3] rounded-[10px]" style={{ background: c }} />
                  <span className="text-xs font-semibold">Listing address</span>
                  <span className="text-[11px]" style={{ color: BRAND.taupe }}>imported listing</span>
                </div>
              ))}
            </div>
            <div className="mx-5 mb-5 flex items-center gap-3 rounded-[14px] px-4 py-3.5" style={{ background: BRAND.evergreen, color: BRAND.ivory }}>
              <span className="h-7 w-7 shrink-0 rounded-lg" style={{ background: BRAND.brass }} />
              <span className="flex-1 text-sm">“Make the hero darker and add my Eichler listings first.”</span>
              <span className="hidden text-[11px] uppercase tracking-[0.18em] sm:inline" style={{ color: BRAND.sage }}>editing…</span>
            </div>
          </div>
        </section>

        <section id="features" className="border-y bg-white" style={{ borderColor: BRAND.sand }}>
          <div className="mx-auto flex max-w-[1280px] flex-col gap-16 px-5 py-24 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className={`${h2} max-w-[760px]`} style={serif}>Websites that don’t go stale.</h2>
              <p className={label} style={{ color: BRAND.taupe }}>no editor · no developer · no waiting</p>
            </div>
            {FEATURES.map((f) => (
              <div key={f.n} className="grid gap-6 border-t pt-8 lg:grid-cols-3" style={{ borderColor: BRAND.evergreen }}>
                <div className="flex flex-col gap-2.5">
                  <span className={label} style={{ color: BRAND.taupe }}>{f.n}</span>
                  <h3 className="text-[34px] leading-tight" style={serif}>{f.title}</h3>
                  <p className="text-base leading-normal" style={{ color: BRAND.ink }}>{f.lead}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                  {f.items.map(([t, d]) => (
                    <div key={t} className="flex flex-col gap-2 rounded p-6" style={{ background: BRAND.ivory }}>
                      <strong className="text-[19px] tracking-[-0.02em]">{t}</strong>
                      <span className="text-[15px] leading-normal" style={{ color: BRAND.ink }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-24 sm:px-8">
          <h2 className={h2} style={serif}>Live in four steps<span style={{ color: BRAND.brass }}>.</span></h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([n, t, d], i) => (
              <li key={n} className="flex flex-col gap-2.5 border-t-2 pt-5" style={{ borderColor: i === 3 ? BRAND.brass : BRAND.evergreen }}>
                <span className="text-[56px] leading-none" style={{ ...serif, color: i === 3 ? BRAND.evergreen : BRAND.taupe }}>{n}</span>
                <strong className="text-[22px] tracking-[-0.02em]">{t}</strong>
                <span className="text-[15px] leading-normal" style={{ color: BRAND.ink }}>{d}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="templates" style={{ background: BRAND.evergreen, color: BRAND.ivory }}>
          <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-24 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className={h2} style={serif}>Templates that look<br />like a top producer.</h2>
              <Link href="/signup" className="rounded-[2px] border px-5 py-3 font-medium" style={{ borderColor: BRAND.ivory }}>start with one.</Link>
            </div>
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATE_LIST.map((t) => (
                <div key={t.id} className="flex flex-col gap-3.5">
                  <div className="overflow-hidden rounded"><TemplateThumb t={t} tall /></div>
                  <strong className="text-xl">{t.name}</strong>
                  <span className="text-sm leading-normal" style={{ color: BRAND.sage }}>{t.description}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto grid max-w-[1280px] items-start gap-10 px-5 py-24 sm:px-8 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h2 className={h2} style={serif}>Free for<br />early access.</h2>
            <p className="max-w-[460px] text-lg leading-normal" style={{ color: BRAND.ink }}>Join now and get everything to launch and run your site at no cost, for a limited time. Paid plans come later, and early-access agents will be the first to hear about them.</p>
          </div>
          <div className="flex flex-col gap-6 rounded border bg-white p-8 sm:p-9" style={{ borderColor: BRAND.sand }}>
            <div className="flex flex-wrap items-baseline gap-2"><span className="text-5xl sm:text-[64px]" style={serif}>Free</span><span style={{ color: BRAND.taupe }}>during early access · limited time</span></div>
            <ul className="flex flex-col gap-3 text-base">
              {["Custom website on your domain", "Import from your current site", "Edits just by asking", "Modern templates made for agents"].map((x) => (
                <li key={x} className="flex gap-3"><Check />{x}</li>
              ))}
            </ul>
            <Link href="/signup" className="rounded-[2px] px-7 py-[18px] text-center text-[17px] font-bold" style={{ background: BRAND.brass, color: BRAND.evergreen }}>launch my site.</Link>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 pb-24 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-8 rounded px-8 py-14 sm:px-12 sm:py-16" style={{ background: BRAND.brass }}>
            <h2 className="text-5xl leading-[0.9] sm:text-7xl lg:text-8xl" style={serif}>Ready when<br />you are.</h2>
            <Link href="/signup" className="rounded-[2px] px-8 py-5 text-lg font-semibold" style={{ background: BRAND.evergreen, color: BRAND.ivory }}>launch my site.</Link>
          </div>
        </section>

        <MarketingFooter topHref="#signup" />
      </div>
    </div>
  );
}
