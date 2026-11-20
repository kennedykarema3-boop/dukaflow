"use client";

import { useActionState } from "react";
import { revokeTeamInvitation } from "@/app/actions/team";
import type { TeamInviteState } from "@/app/actions/team";

const initialState: TeamInviteState = {};

export default function RevokeInvitationButton({
    invitationId,
}: {
    invitationId: string;
}) {
    const [state, formAction, isPending] = useActionState(
        revokeTeamInvitation,
        initialState
    );

    return (
        <div className="space-y-2">
            <form
                action={formAction}
                onSubmit={(event) => {
                    if (!window.confirm("Are you sure you want to revoke this invitation?")) {
                        event.preventDefault();
                    }
                }}
            >
                <input
                    type="hidden"
                    name="invitationId"
                    value={invitationId}
                />

                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                    {isPending ? "Revoking..." : "Revoke"}
                </button>
            </form>

            {state.error && (
                <p className="text-xs text-red-600">{state.error}</p>
            )}

            {state.success && (
                <p className="text-xs text-green-700">{state.success}</p>
            )}
        </div>
    );
}