"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
    createTeamInvitation,
    type TeamInviteState,
} from "@/app/actions/team";

const initialState: TeamInviteState = {};

export default function InviteTeamMemberPage() {
    const [state, formAction, isPending] = useActionState(
        createTeamInvitation,
        initialState
    );

    async function copyInvitationLink() {
        if (state.inviteLink) {
            await navigator.clipboard.writeText(state.inviteLink);
        }
    }

    return (
        <main className="mx-auto max-w-2xl p-6">
            <Link
                href="/dashboard/team"
                className="text-sm text-blue-600 hover:underline"
            >
                ← Back to team
            </Link>

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">
                    Invite a team member
                </h1>

                <p className="mt-2 text-sm text-gray-600">
                    Enter their email address and choose the level of access they should
                    have in your business.
                </p>

                <form action={formAction} className="mt-6 space-y-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Team member&apos;s email
                        </label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="name@example.com"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="role"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Choose a role
                        </label>

                        <select
                            id="role"
                            name="role"
                            required
                            defaultValue="staff"
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="manager">Manager</option>
                            <option value="cashier">Cashier</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                        The invitation link will be valid for 7 days. You will need to
                        share the link with the invited person yourself.
                    </div>

                    {state.error && (
                        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {state.error}
                        </p>
                    )}

                    {state.success && (
                        <div className="space-y-3 rounded-lg bg-green-50 p-4">
                            <p className="text-sm font-medium text-green-800">
                                {state.success}
                            </p>

                            {state.inviteLink && (
                                <>
                                    <input
                                        readOnly
                                        value={state.inviteLink}
                                        aria-label="Invitation link"
                                        className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-gray-800"
                                    />

                                    <button
                                        type="button"
                                        onClick={copyInvitationLink}
                                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                                    >
                                        Copy invitation link
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? "Creating invitation..." : "Create invitation"}
                    </button>
                </form>
            </div>
        </main>
    );
}
