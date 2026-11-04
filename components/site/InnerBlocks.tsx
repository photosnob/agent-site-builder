import type { Block } from "@/lib/blocks/schema";
import type { AgentProfile } from "@/lib/types";
import { reviewsFor, type SiteData } from "@/lib/siteData";

type Agent = Partial<AgentProfile>;
type Of<T extends Block["type"]> = Extract<Block, { type: T }>;

const paragraphs = (s: string) => s.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "");

export function PageHeader({ b }: { b: Of<"page-header"> }) {
  if (b.props.image) {
    return (
      <div className="relative flex min-h-[46vh] items-end overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.props.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-black/10" />
        <div className="site-container relative pb-12 text-white">
          {b.props.eyebrow && <p className="mb-3 text-xs uppercase tracking-[0.25em] opacity-85">{b.props.eyebrow}</p>}
          <h1 className="site-heading max-w-3xl text-4xl leading-tight sm:text-5xl">{b.props.headline}</h1>
          {b.props.intro && <p className="mt-4 max-w-2xl text-lg opacity-90">{b.props.intro}</p>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: "var(--surface)" }}>
      <div className="site-container py-14 md:py-20">
        {b.props.eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "var(--accent)" }}>{b.props.eyebrow}</p>}
        <h1 className="site-heading max-w-3xl text-4xl leading-tight sm:text-5xl">{b.props.headline}</h1>
        {b.props.intro && <p className="mt-4 max-w-2xl text-lg" style={{ color: "var(--muted)" }}>{b.props.intro}</p>}
      </div>
    </div>
  );
}

export function RichText({ b }: { b: Of<"rich-text"> }) {
  return (
    <div className="site-container py-12 md:py-16">
      <div className="max-w-3xl">
        {b.props.headline && <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>}
        {paragraphs(b.props.body).map((p, i) => <p key={i} className="mt-5 text-lg leading-relaxed" style={{ color: "var(--muted)" }}>{p}</p>)}
      </div>
    </div>
  );
}

export function Steps({ b }: { b: Of<"steps"> }) {
  return (
    <div className="site-container py-12 md:py-16">
      <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
      {b.props.intro && <p className="mt-3 max-w-2xl" style={{ color: "var(--muted)" }}>{b.props.intro}</p>}
      <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {b.props.items.map((it, i) => (
          <li key={i} className="flex gap-5">
            <span className="site-heading flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>{i + 1}</span>
            <div>
              <h3 className="site-heading text-xl">{it.title}</h3>
              <p className="mt-2 leading-relaxed" style={{ color: "var(--muted)" }}>{it.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Faq({ b }: { b: Of<"faq"> }) {
  return (
    <div className="py-12 md:py-16" style={{ background: "var(--surface)" }}>
      <div className="site-container max-w-3xl">
        <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
        <div className="mt-8 divide-y" style={{ borderColor: "var(--bg)" }}>
          {b.props.items.map((it, i) => (
            <details key={i} className="group py-5" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {it.q}
                <span aria-hidden className="text-2xl leading-none transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TeamGrid({ b, data, agent, headshot }: { b: Of<"team-grid">; data: SiteData; agent: Agent; headshot?: string }) {
  // The agent leads the grid even before team members are added.
  const people = [
    { id: "agent", name: agent.name ?? "", title: "Founder", photo: headshot ?? null, bio: agent.shortBio ?? null, email: agent.email ?? null, phone: agent.phone ?? null, license: agent.licenseNumber ? `${agent.licenseState ?? ""} #${agent.licenseNumber}` : null },
    ...data.team.filter((m) => m.name.trim().toLowerCase() !== (agent.name ?? "").trim().toLowerCase()),
  ];
  return (
    <div className="site-container py-12 md:py-16">
      <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
      {b.props.intro && <p className="mt-3 max-w-2xl" style={{ color: "var(--muted)" }}>{b.props.intro}</p>}
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((p) => (
          <article key={p.id}>
            {p.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo} alt={p.name} loading="lazy" className="aspect-[4/5] w-full object-cover" style={{ borderRadius: "var(--radius)" }} />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center text-5xl" style={{ background: "var(--surface)", borderRadius: "var(--radius)", color: "var(--muted)" }}>{p.name.slice(0, 1)}</div>
            )}
            <h3 className="site-heading mt-4 text-xl">{p.name}</h3>
            {p.title && <p className="text-sm uppercase tracking-wide" style={{ color: "var(--accent)" }}>{p.title}</p>}
            {p.bio && <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{p.bio}</p>}
            <div className="mt-2 space-y-0.5 text-sm">
              {p.phone && <p><a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>{p.phone}</a></p>}
              {p.email && <p><a href={`mailto:${p.email}`}>{p.email}</a></p>}
              {p.license && <p className="text-xs" style={{ color: "var(--muted)" }}>License {p.license}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return <span aria-label={`${n} out of 5 stars`} style={{ color: "var(--accent)" }}>{"★".repeat(n)}<span style={{ opacity: 0.25 }}>{"★".repeat(5 - n)}</span></span>;
}

export function Reviews({ b, data, fallback }: { b: Of<"reviews">; data: SiteData; fallback?: { quote: string; author: string }[] }) {
  const list = reviewsFor(data, b.props.mode);
  const items = list.length ? list.map((t) => ({ id: t.id, quote: t.quote, author: t.author, context: t.context, rating: t.rating })) : (fallback ?? []).map((t, i) => ({ id: String(i), ...t, context: null, rating: null }));
  return (
    <div className="py-12 md:py-16">
      <div className="site-container">
        <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
        {b.props.intro && <p className="mt-3 max-w-2xl" style={{ color: "var(--muted)" }}>{b.props.intro}</p>}
        {items.length === 0 && <p className="mt-8 text-sm" style={{ color: "var(--muted)" }}>Client stories are coming soon.</p>}
        <div className="mt-10 columns-1 gap-6 md:columns-2 lg:columns-3">
          {items.map((t) => (
            <figure key={t.id} className="mb-6 break-inside-avoid p-7" style={{ background: "var(--surface)", borderRadius: "var(--radius)" }}>
              {t.rating ? <Stars n={t.rating} /> : null}
              <blockquote className="mt-2 leading-relaxed">“{t.quote}”</blockquote>
              <figcaption className="mt-4 text-sm font-semibold">
                {t.author}
                {t.context && <span className="block font-normal" style={{ color: "var(--muted)" }}>{t.context}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RecentPosts({ b, data, base }: { b: Of<"recent-posts">; data: SiteData; base?: string }) {
  const posts = data.posts.slice(0, b.props.count);
  if (!posts.length) return null;
  const href = (slug: string) => (base === undefined ? "#" : `${base}/blog/${slug}`);
  return (
    <div className="site-container py-12 md:py-16">
      <h2 className="site-heading text-3xl sm:text-4xl">{b.props.headline}</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <a key={p.slug} href={href(p.slug)} className="group block">
            {p.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_image} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover" style={{ borderRadius: "var(--radius)" }} />
            ) : <div className="aspect-[3/2] w-full" style={{ background: "var(--surface)", borderRadius: "var(--radius)" }} />}
            <p className="mt-3 text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{fmtDate(p.published_at)}</p>
            <h3 className="site-heading mt-1 text-lg leading-snug group-hover:underline">{p.title}</h3>
          </a>
        ))}
      </div>
    </div>
  );
}
