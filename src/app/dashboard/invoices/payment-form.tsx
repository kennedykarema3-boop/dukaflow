
"use client";

import { useState } from "react";
import { recordInvoicePayment } from "@/app/actions/invoices";

export default function PaymentForm({
    invoiceId,
    balance,
    currency,
}: {
    invoiceId: string;
    balance: number;
    currency: string;
}) {
    const [message, setMessage] = useState("");
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        setMessage("");

        const result = await recordInvoicePayment(formData);

        setMessage(result.error || result.success || "");
        setIsPending(false);

        if (result.success) {
            window.location.reload();
        }
    }

    if (balance <= 0) {
        return (
            <p className="font-medium text-green-700">
                This invoice has been fully paid.
            </p>
        );
    }

    return (
        <form action={handleSubmit} className="mt-6 max-w-md space-y-3">
            <h2 className="text-lg font-semibold">Record customer payment</h2>

            <input type="hidden" name="invoiceId" value={invoiceId} />

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Payment amount ({currency})
                </label>

                <input
                    name="amount"
                    type="number"
                    min="0.01"
                    max={balance}
                    step="0.01"
                    required
                    placeholder="Enter amount received"
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <p className="text-sm text-gray-500">
                Outstanding balance: {currency} {balance.toLocaleString()}
            </p>

            <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
            >
                {isPending ? "Recording..." : "Record payment"}
            </button>

            {message && (
                <p className="text-sm text-red-600">{message}</p>
            )}
        </form>
    );
}
