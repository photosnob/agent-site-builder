import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "AI usage" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/blog", label: "Blog" },
];

export function AdminNav() {
  return (
    <nav aria-label="Admin" className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-6 py-2.5 text-sm">
        <span className="mr-3 font-semibold">Admin</span>
        {LINKS.map((l) => <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900">{l.label}</Link>)}
        <Link href="/dashboard" className="ml-auto text-stone-500 hover:text-stone-900">My dashboard →</Link>
      </div>
    </nav>
  );
}
