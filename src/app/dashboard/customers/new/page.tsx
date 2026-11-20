"use client";

import { useActionState } from "react";
import { createCustomer } from "@/app/actions/customers";

const initialState = {
    error: "",
};

export default function NewCustomerPage() {
    const [state, formAction, isPending] = useActionState(
        async (_previousState: typeof initialState, formData: FormData) => {
            const result = await createCustomer(formData);
            return result ?? initialState;
        },
        initialState
    );

    return (
        <main className="mx-auto max-w-2xl p-6">
            <a
                href="/dashboard/customers"
                className="text-sm text-gray-500 underline"
            >
                ← Back to customers
            </a>

            <h1 className="mt-5 text-2xl font-bold">Add customer</h1>
            <p className="mt-1 text-gray-500">
                Enter your customer&apos;s details below.
            </p>

            <form action={formAction} className="mt-6 space-y-5">
                <div>
                    <label className="mb-2 block font-medium">Full name *</label>
                    <input
                        name="fullName"
                        required
                        minLength={2}
                        maxLength={150}
                        className="w-full rounded-lg border p-3"
                        placeholder="Customer full name"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Phone number</label>
                    <input
                        name="phone"
                        type="tel"
                        maxLength={30}
                        className="w-full rounded-lg border p-3"
                        placeholder="+254..."
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Email address</label>
                    <input
                        name="email"
                        type="email"
                        maxLength={254}
                        className="w-full rounded-lg border p-3"
                        placeholder="customer@example.com"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Address</label>
                    <textarea
                        name="address"
                        maxLength={500}
                        rows={3}
                        className="w-full rounded-lg border p-3"
                        placeholder="Customer address"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Notes</label>
                    <textarea
                        name="notes"
                        maxLength={1000}
                        rows={3}
                        className="w-full rounded-lg border p-3"
                        placeholder="Additional information"
                    />
                </div>

                {state.error && (
                    <p className="rounded-lg bg-red-50 p-3 text-red-700">
                        {state.error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-black px-6 py-3 font-medium text-white disabled:opacity-50"
                >
                    {isPending ? "Saving..." : "Save customer"}
                </button>
            </form>
        </main>
    );
}