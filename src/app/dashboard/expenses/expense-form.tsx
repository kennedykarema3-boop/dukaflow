"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createExpense } from "@/app/actions/expenses";

const initialState = {
    error: "",
};

export default function ExpenseForm() {
    const [state, formAction, isPending] = useActionState(
        createExpense,
        initialState
    );

    return (
        <form action={formAction} className="max-w-2xl space-y-5">
            <div>
                <label className="mb-1 block text-sm font-medium">
                    Expense category
                </label>
                <select
                    name="category"
                    required
                    className="w-full rounded-lg border p-3"
                    defaultValue=""
                >
                    <option value="" disabled>Select category</option>
                    <option value="Rent">Rent</option>
                    <option value="Transport">Transport</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Internet">Internet</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Description
                </label>
                <input
                    name="description"
                    required
                    minLength={2}
                    maxLength={200}
                    placeholder="e.g. Monthly shop rent"
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Amount
                </label>
                <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="e.g. 5000"
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Expense date
                </label>
                <input
                    name="expenseDate"
                    type="date"
                    required
                    defaultValue={new Date().toLocaleDateString("en-CA")}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Payment method
                </label>
                <select
                    name="paymentMethod"
                    className="w-full rounded-lg border p-3"
                    defaultValue=""
                >
                    <option value="">Not specified</option>
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank transfer">Bank transfer</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Reference (optional)
                </label>
                <input
                    name="reference"
                    maxLength={100}
                    placeholder="Receipt or transaction number"
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Notes (optional)
                </label>
                <textarea
                    name="notes"
                    maxLength={1000}
                    rows={3}
                    placeholder="Additional details..."
                    className="w-full rounded-lg border p-3"
                />
            </div>

            {state.error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
                >
                    {isPending ? "Saving..." : "Save expense"}
                </button>

                <Link
                    href="/dashboard/expenses"
                    className="rounded-lg border px-5 py-3"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}