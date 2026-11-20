
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InvitationLinkButton from "./invitation-link-button";
import RevokeInvitationButton from "./revoke-invitation-button";

async function TeamContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) redirect("/login");

    const { data: businesses, error: businessError } =
        await supabase.rpc("get_my_business");

    const business = businesses?.[0];

    if (businessError || !business) {
        return (
            <main className="p-6">
                <p>Could not load your business workspace.</p>
            </main>
        );
    }

    const { data: members, error: membersError } =
        await supabase.rpc("get_my_team_members");

    const { data: invitations, error: invitationsError } =
        await supabase
            .from("business_invitations")
            .select("id, email, role, status, expires_at, created_at")
            .eq("business_id", business.business_id)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

    return (
        <main className="mx-auto max-w-6xl p-6">
            {/* Page heading */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Team members
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Manage who has access to your business.
                    </p>
                </div>

                {business.role === "owner" && (
                    <Link
                        href="/dashboard/team/invite"
                        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                    >
                        + Invite team member
                    </Link>
                )}
            </div>

            {/* Business information */}
            <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-500">
                    Business workspace
                </p>

                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                    {business.name}
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                    Your role:{" "}
                    <span className="font-medium capitalize">
                        {business.role}
                    </span>
                </p>
            </section>

            {/* Team members */}
            <section className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900">
                    Your team
                </h2>

                {membersError ? (
                    <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                        Could not load team members: {membersError.message}
                    </p>
                ) : !members || members.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
                        No team members found.
                    </p>
                ) : (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Joined</th>
                                </tr>
                            </thead>

                            <tbody>
                                {members.map((member: {
                                    user_id: string;
                                    full_name: string | null;
                                    email: string | null;
                                    role: string;
                                    joined_at: string;
                                }) => (
                                    <tr
                                        key={member.user_id}
                                        className="border-t border-gray-100"
                                    >
                                        <td className="p-4 font-medium text-gray-900">
                                            {member.full_name || "Unnamed member"}
                                        </td>

                                        <td className="p-4 text-gray-600">
                                            {member.email || "No email"}
                                        </td>

                                        <td className="p-4 capitalize text-gray-700">
                                            {member.role}
                                        </td>

                                        <td className="p-4 text-gray-600">
                                            {new Date(member.joined_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Pending invitations */}
            {business.role === "owner" && (
                <section className="mt-10">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Pending invitations
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        Manage invitations that have not yet been accepted.
                    </p>

                    {invitationsError ? (
                        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                            Could not load invitations: {invitationsError.message}
                        </p>
                    ) : !invitations || invitations.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
                            There are no pending invitations.
                        </p>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Invited</th>
                                        <th className="p-4">Expires</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Invitation link</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {invitations.map((invitation) => (
                                        <tr
                                            key={invitation.id}
                                            className="border-t border-gray-100"
                                        >
                                            <td className="p-4 font-medium text-gray-900">
                                                {invitation.email}
                                            </td>

                                            <td className="p-4 capitalize text-gray-700">
                                                {invitation.role}
                                            </td>

                                            <td className="p-4 text-gray-600">
                                                {new Date(
                                                    invitation.created_at
                                                ).toLocaleDateString()}
                                            </td>

                                            <td className="p-4 text-gray-600">
                                                {new Date(
                                                    invitation.expires_at
                                                ).toLocaleDateString()}
                                            </td>

                                            <td className="p-4">
                                                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                                                    Pending
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                <InvitationLinkButton
                                                    invitationId={invitation.id}
                                                />
                                            </td>

                                            <td className="p-4">
                                                <RevokeInvitationButton
                                                    invitationId={invitation.id}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}

export default function TeamPage() {
    return (
        <Suspense
            fallback={
                <main className="p-6">
                    Loading team...
                </main>
            }
        >
            <TeamContent />
        </Suspense>
    );
}
