import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "lvh.me:3000").toLowerCase();
const APP_HOSTS = new Set([ROOT, `www.${ROOT}`, `app.${ROOT}`, "localhost:3000", "127.0.0.1:3000"]);

/**
 * Public SEO file URLs → internal route handlers. (Folders literally named
 * sitemap.xml/robots.txt collide with Next's built-in metadata files.)
 */
const SEO_FILES: Record<string, string> = {
  "/sitemap.xml": "/seo/sitemap",
  "/robots.txt": "/seo/robots",
  "/llms.txt": "/seo/llms",
  "/blog/rss.xml": "/seo/rss",
};

// ---- Custom domain lookups (cached per server instance for a minute) ----
type Hit = { slug: string; domain: string | null; active: boolean } | null;
const cache = new Map<string, { hit: Hit; exp: number }>();
async function lookup(kind: "domain" | "slug", key: string): Promise<Hit> {
  const k = `${kind}:${key}`;
  const c = cache.get(k);
  if (c && c.exp > Date.now()) return c.hit;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !svc) return null;
  // www.x.com and x.com both find the site (Vercel normally redirects one to the other first).
  const alt = key.startsWith("www.") ? key.slice(4) : `www.${key}`;
  const filter = kind === "domain" ? `custom_domain=in.(${encodeURIComponent(`"${key}","${alt}"`)})` : `slug=eq.${encodeURIComponent(key)}`;
  let hit: Hit = null;
  try {
    const res = await fetch(`${base}/rest/v1/sites?select=slug,custom_domain,domain_status&${filter}&limit=1`, {
      headers: { apikey: svc, Authorization: `Bearer ${svc}` },
      signal: AbortSignal.timeout(2500),
    });
    const rows = res.ok ? ((await res.json()) as { slug: string; custom_domain: string | null; domain_status: string | null }[]) : [];
    if (rows[0]) hit = { slug: rows[0].slug, domain: rows[0].custom_domain, active: rows[0].domain_status === "active" };
    if (!res.ok) return null; // don't cache errors
  } catch { return null; }
  cache.set(k, { hit, exp: Date.now() + (hit ? 60_000 : 30_000) });
  if (cache.size > 5000) cache.delete(cache.keys().next().value!);
  return hit;
}

function rewriteToSite(req: NextRequest, slug: string, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = `/h/${slug}${SEO_FILES[pathname] ?? (pathname === "/" ? "" : pathname)}`;
  return NextResponse.rewrite(url);
}

// The app's own addresses, from env: NEXT_PUBLIC_APP_URL and the URLs Vercel provides.
const hostOf = (u?: string) => { try { return u ? new URL(u.startsWith("http") ? u : `https://${u}`).host.toLowerCase() : ""; } catch { return ""; } };
for (const h of [process.env.NEXT_PUBLIC_APP_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].map(hostOf)) {
  if (h) { APP_HOSTS.add(h); APP_HOSTS.add(h.startsWith("www.") ? h.slice(4) : `www.${h}`); }
}

const isPlatformHost = (host: string) =>
  APP_HOSTS.has(host) || host.endsWith(`.${ROOT}`) || host.endsWith(".vercel.app") || host.startsWith("localhost") || host.startsWith("127.0.0.1") || host === "";

export async function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const { pathname } = req.nextUrl;

  // 1) Agent site on a subdomain: jane-doe.<root>/anything → /h/jane-doe/anything (hosted mode)
  if (!APP_HOSTS.has(host) && host.endsWith(`.${ROOT}`)) {
    const slug = host.slice(0, -(ROOT.length + 1));
    if (/^[a-z0-9-]{3,48}$/.test(slug) && !pathname.startsWith("/api/")) {
      // Once the agent's own domain is connected, send visitors (and Google) there instead.
      const hit = await lookup("slug", slug);
      if (hit?.active && hit.domain) return NextResponse.redirect(`https://${hit.domain}${pathname}${req.nextUrl.search}`, 308);
      return rewriteToSite(req, slug, pathname);
    }
  }

  // 2) Agent's own domain (janedoe.com): same pages as the subdomain.
  if (!isPlatformHost(host)) {
    if (pathname.startsWith("/api/")) return NextResponse.next(); // lead forms etc. post here
    const hit = await lookup("domain", host.replace(/:\d+$/, ""));
    if (hit) return rewriteToSite(req, hit.slug, pathname);
    // Not an agent's domain: it's one of ours (Vercel only routes domains added to this
    // project), so fall through and serve the app normally.
  }

  // Path-mode sites: /s/<slug>/sitemap.xml etc. (robots.txt only works at a host root).
  const pathSeo = pathname.match(/^\/s\/([a-z0-9-]{3,48})(\/sitemap\.xml|\/llms\.txt|\/blog\/rss\.xml)$/);
  if (pathSeo) {
    const url = req.nextUrl.clone();
    url.pathname = `/s/${pathSeo[1]}${SEO_FILES[pathSeo[2]]}`;
    return NextResponse.rewrite(url);
  }

  // 2) App routes: keep the Supabase session fresh.
  let res = NextResponse.next({ request: req });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return res;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const needsAuth = ["/onboarding", "/dashboard", "/preview", "/admin"].some((p) => pathname.startsWith(p));
  if (needsAuth && !data.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$).*)"],
};
