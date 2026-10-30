import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "lvh.me:3000").toLowerCase();
const APP_HOSTS = new Set([ROOT, `www.${ROOT}`, `app.${ROOT}`, "localhost:3000", "127.0.0.1:3000"]);

export async function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const { pathname } = req.nextUrl;

  // 1) Agent site on a subdomain: jane-doe.<root>/anything → /s/jane-doe/anything
  if (!APP_HOSTS.has(host) && host.endsWith(`.${ROOT}`)) {
    const slug = host.slice(0, -(ROOT.length + 1));
    if (/^[a-z0-9-]{3,48}$/.test(slug) && !pathname.startsWith("/api/")) {
      const url = req.nextUrl.clone();
      url.pathname = `/s/${slug}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  // Custom domains: look up sites.custom_domain here (cache it at the edge) and
  // rewrite the same way. Left out of the MVP; see README.

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
  const needsAuth = pathname.startsWith("/onboarding") || pathname.startsWith("/dashboard") || pathname.startsWith("/preview");
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
