"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createProduct } from "@/app/actions/products";

const initialState: { error: string } = { error: "" };

export default function NewProductPage() {
    const handleCreateProduct = async (
        _prevState: typeof initialState,
        formData: FormData
    ) => {
        return createProduct(formData);
    };

    const [state, formAction, isPending] = useActionState(
        handleCreateProduct,
        initialState
    );

    return (
        <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
            <Link
                href="/dashboard/products"
                className="text-sm font-medium text-emerald-700"
            >
                ← Back to products
            </Link>

            <h1 className="mt-6 text-3xl font-bold">Add product</h1>
            <p className="mt-2 text-slate-600">
                Enter the details of the product you want to sell.
            </p>

            <form action={formAction} className="mt-8 space-y-5 rounded-xl border bg-white p-6">
                <div>
                    <label className="mb-2 block font-medium">Product name *</label>
                    <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={150}
                        placeholder="e.g. Blue T-shirt"
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Description</label>
                    <textarea
                        name="description"
                        maxLength={1000}
                        placeholder="Describe your product"
                        rows={3}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">SKU / Product code</label>
                    <input
                        name="sku"
                        maxLength={100}
                        placeholder="e.g. TSH-001"
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Selling price *</label>
                    <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Cost price *</label>
                    <input
                        name="costPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                {state.error && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {state.error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-lg bg-emerald-600 p-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                    {isPending ? "Saving product..." : "Save product"}
                </button>
            </form>
        </main>
    );
}