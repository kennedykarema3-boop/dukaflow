import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type InvitePageProps = {
    params: Promise<{ token: string }>;
};

async function InvitationContent({ params }: InvitePageProps) {
    await connection();

    const { token } = await params;

    if (!/^[a-f0-9]{64}$/i.test(token)) {
        return (
            <main className="mx-auto max-w-lg p-6">
                <h1 className="text-2xl font-bold">Invalid invitation</h1>
                <p className="mt-3 text-gray-600">
                    This invitation link is not valid.
                </p>
            </main>
        );
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const { data, error } = await supabase.rpc(
        "accept_business_invitation",
        {
            p_token_hash: tokenHash,
        }
    );

    if (error) {
        return (
            <main className="mx-auto max-w-lg p-6">
                <div className="rounded-xl border border-red-200 bg-white p-6">
                    <h1 className="text-2xl font-bold text-red-700">
                        Invitation could not be accepted
                    </h1>
                    <p className="mt-3 text-gray-600">{error.message}</p>
                    <Link
                        href="/dashboard"
                        className="mt-5 inline-block text-blue-600 hover:underline"
                    >
                        Go to dashboard
                    </Link>
                </div>
            </main>
        );
    }

    if (!data?.success) {
        return (
            <main className="mx-auto max-w-lg p-6">
                <h1 className="text-2xl font-bold">Invitation not completed</h1>
                <p className="mt-3 text-gray-600">
                    We could not confirm this invitation.
                </p>
            </main>
        );
    }

    redirect("/dashboard");
}

export default function InvitationPage(props: InvitePageProps) {
    return (
        <Suspense
            fallback={
                <main className="p-6">
                    <p>Checking your invitation...</p>
                </main>
            }
        >
            <InvitationContent {...props} />
        </Suspense>
    );
}