
"use client";

import { useActionState } from "react";
import { recordSalePayment } from "@/app/actions/sales";

const initialState = {
    error: "",
    success: false,
} as { error?: string; success?: boolean };

export default function PaymentForm({
    saleId,
    balance,
    currency,
}: {
    saleId: string;
    balance: number;
    currency: string;
}) {
    const [state, formAction, isPending] = useActionState(
        async (
            _previousState: typeof initialState,
            formData: FormData
        ) => {
            return (
                (await recordSalePayment(formData)) ?? initialState
            );
        },
        initialState
    );

    const money = (amount: number) =>
        new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
        }).format(amount);

    if (balance <= 0) {
        return (
            <p className="mt-4 rounded-lg bg-green-50 p-4 text-green-700">
                This sale is fully paid. No outstanding balance.
            </p>
        );
    }

    return (
        <form action={formAction} className="mt-5 space-y-4">
            <input type="hidden" name="saleId" value={saleId} />

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Additional payment amount
                </label>
                <input
                    type="number"
                    name="amount"
                    min="0.01"
                    max={balance}
                    step="0.01"
                    required
                    className="w-full rounded-lg border p-3"
                    placeholder="Enter amount received"
                />
                <p className="mt-1 text-sm text-gray-500">
                    Outstanding: {money(balance)}
                </p>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Payment notes (optional)
                </label>
                <textarea
                    name="notes"
                    rows={2}
                    maxLength={1000}
                    className="w-full rounded-lg border p-3"
                    placeholder="e.g. Second instalment"
                />
            </div>

            {state.error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            {state.success && (
                <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    Payment recorded successfully.
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
            >
                {isPending ? "Recording payment..." : "Record payment"}
            </button>
        </form>
    );
}
