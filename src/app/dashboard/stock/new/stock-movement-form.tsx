"use client";

import { useActionState } from "react";
import Link from "next/link";
import { recordStockMovement } from "@/app/actions/stock";

type Product = {
    id: string;
    name: string;
    sku: string | null;
};

type Props = {
    products: Product[];
};

const initialState = { error: "" };

export default function StockMovementForm({ products }: Props) {
    const [state, formAction, isPending] = useActionState(
        async (_previousState: typeof initialState, formData: FormData) => {
            const result = await recordStockMovement(formData);
            return result ?? initialState;
        },
        initialState
    );

    return (
        <form action={formAction} className="space-y-5 rounded-xl border p-5">
            <div>
                <label className="mb-2 block font-medium">Product</label>
                <select
                    name="productId"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border p-3"
                >
                    <option value="" disabled>
                        Select a product
                    </option>

                    {products.map((product) => (
                        <option key={product.id} value={product.id}>
                            {product.name}
                            {product.sku ? ` (${product.sku})` : ""}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="mb-2 block font-medium">Movement type</label>
                <select
                    name="movementType"
                    required
                    className="w-full rounded-lg border p-3"
                    defaultValue="stock_in"
                >
                    <option value="stock_in">Stock received</option>
                    <option value="stock_out">Stock removed</option>
                    <option value="adjustment">Set exact stock quantity</option>
                </select>
            </div>

            <div>
                <label className="mb-2 block font-medium">Quantity</label>
                <input
                    name="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="Enter quantity"
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">
                    Reference (optional)
                </label>
                <input
                    name="reference"
                    maxLength={100}
                    placeholder="e.g. Purchase receipt 001"
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">Notes (optional)</label>
                <textarea
                    name="notes"
                    maxLength={500}
                    rows={3}
                    placeholder="Add a note..."
                    className="w-full rounded-lg border p-3"
                />
            </div>

            {state.error && (
                <p className="rounded-lg bg-red-50 p-3 text-red-700">
                    {state.error}
                </p>
            )}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isPending || products.length === 0}
                    className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
                >
                    {isPending ? "Saving..." : "Save Movement"}
                </button>

                <Link
                    href="/dashboard/stock"
                    className="rounded-lg border px-5 py-3"
                >
                    Cancel
                </Link>
            </div>

            {products.length === 0 && (
                <p className="text-sm text-gray-500">
                    No active products found. Add a product before recording stock.
                </p>
            )}
        </form>
    );
}