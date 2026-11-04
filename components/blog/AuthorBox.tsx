import type { AgentProfile } from "@/lib/types";
import { briefBio } from "@/lib/social";
import { SocialLinks } from "@/components/site/SocialLinks";

/** "About the author" at the end of each post: circular headshot, short bio, links. */
export function AuthorBox({ agent, headshot, fallbackBio, aboutHref }: { agent: Partial<AgentProfile>; headshot?: string; fallbackBio?: string; aboutHref: string }) {
  const bio = agent.shortBio?.trim() || briefBio(fallbackBio);
  const first = agent.name?.split(" ")[0] ?? "the author";
  return (
    <aside aria-labelledby="about-author" className="mt-14 flex flex-col gap-5 border-t pt-10 sm:flex-row sm:items-start" style={{ borderColor: "var(--surface)" }}>
      {headshot && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={headshot} alt={agent.name ?? ""} width={96} height={96} className="h-24 w-24 shrink-0 rounded-full object-cover" />
      )}
      <div>
        <p id="about-author" className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--muted)" }}>About the author</p>
        <p className="site-heading mt-1 text-xl">{agent.name}</p>
        {agent.brokerage && <p className="text-sm" style={{ color: "var(--muted)" }}>{agent.brokerage}</p>}
        {bio && <p className="mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>{bio}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <a href={aboutHref} className="font-semibold underline underline-offset-4">More about {first}</a>
          <SocialLinks agent={agent} />
        </div>
      </div>
    </aside>
  );
}
