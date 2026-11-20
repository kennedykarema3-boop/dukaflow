import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
      <p className="font-semibold tracking-wide text-emerald-700">DUKAFLOW</p>
      <h1 className="mt-5 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
        Run your business. Grow without limits.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-600">
        Manage inventory, record sales and receive online orders from one simple workspace.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Link className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800" href="/register">Create free account</Link>
        <Link className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-white" href="/pricing">View pricing</Link>
        <Link className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-white" href="/login">Sign in</Link>
      </div>
      <p className="mt-16 text-sm text-slate-500">Starter build · Authentication and secure business workspace foundation</p>
    </main>
  );
}
