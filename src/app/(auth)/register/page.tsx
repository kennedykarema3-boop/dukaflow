import { Suspense } from "react";
import Link from "next/link";
import { register } from "@/app/actions/auth";

type Props = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

async function RegisterContent({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="font-semibold text-emerald-700">
        ← DukaFlow
      </Link>

      <h1 className="mt-8 text-3xl font-bold">Create your account</h1>

      <p className="mt-2 text-slate-600">
        Start managing your business with DukaFlow.
      </p>

      {params.message && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {params.message}
        </p>
      )}

      {params.error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </p>
      )}

      <form action={register} className="mt-8 space-y-4">
        <label className="block text-sm font-medium">
          Full name
          <input
            name="fullName"
            required
            minLength={2}
            autoComplete="name"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          />
        </label>

        <label className="block text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          />
        </label>

        <button className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800">
          Create account
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already registered?{" "}
        <Link className="font-semibold text-emerald-700" href="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}

export default function RegisterPage(props: Props) {
  return (
    <Suspense fallback={<p className="p-6">Loading registration page...</p>}>
      <RegisterContent searchParams={props.searchParams} />
    </Suspense>
  );
}

