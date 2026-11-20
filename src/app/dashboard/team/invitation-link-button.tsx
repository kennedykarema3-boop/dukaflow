"use client";

import { useActionState } from "react";
import { regenerateInvitationLink } from "@/app/actions/team";
import type { TeamInviteState } from "@/app/actions/team";

const initialState: TeamInviteState = {};

export default function InvitationLinkButton({
    invitationId,
}: {
    invitationId: string;
}) {
    const [state, formAction, isPending] = useActionState(
        regenerateInvitationLink,
        initialState
    );

    async function copyLink() {
        if (state.inviteLink) {
            await navigator.clipboard.writeText(state.inviteLink);
        }
    }

    return (
        <div className="min-w-40 space-y-2">
            <form action={formAction}>
                <input
                    type="hidden"
                    name="invitationId"
                    value={invitationId}
                />

                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {isPending ? "Generating..." : "Get new link"}
                </button>
            </form>

            {state.error && (
                <p className="text-xs text-red-600">{state.error}</p>
            )}

            {state.inviteLink && (
                <div className="space-y-2">
                    <input
                        readOnly
                        value={state.inviteLink}
                        aria-label="New invitation link"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-800"
                    />

                    <button
                        type="button"
                        onClick={copyLink}
                        className="rounded bg-green-700 px-3 py-2 text-xs text-white hover:bg-green-800"
                    >
                        Copy link
                    </button>

                    <p className="text-xs text-green-700">
                        New link valid for 7 days.
                    </p>
                </div>
            )}
        </div>
    );
}