import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-stone-500">Porchlight</p>
      <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight">Your agent website, live in ten minutes.</h1>
      <p className="mt-6 text-lg text-stone-600">
        Answer a few questions, point us at your current site, and we&apos;ll pull in your headshot and best listings,
        build a site in the style you choose, and let you change anything by just asking.
      </p>
      <div className="mt-10 flex gap-3">
        <Link href="/signup" className="btn">Get started</Link>
        <Link href="/login" className="btn-ghost">Sign in</Link>
      </div>
    </main>
  );
}
