
"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createInvoice } from "@/app/actions/invoices";

const initialState = {
    error: "",
};

type Customer = {
    id: string;
    full_name: string;
};

type Product = {
    id: string;
    name: string;
    sku: string | null;
    price: number;
};

type InvoiceItem = {
    productId: string;
    quantity: number;
};

export default function InvoiceForm({
    customers,
    products,
    currency,
}: {
    customers: Customer[];
    products: Product[];
    currency: string;
}) {
    const [state, formAction, isPending] = useActionState(
        createInvoice,
        initialState
    );

    const [items, setItems] = useState<InvoiceItem[]>([
        { productId: "", quantity: 1 },
    ]);

    const [discount, setDiscount] = useState("0");

    const subtotal = items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    const discountAmount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal - discountAmount);

    const invoiceItems = items
        .filter((item) => item.productId && item.quantity > 0)
        .map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
        }));

    function updateItem(
        index: number,
        field: keyof InvoiceItem,
        value: string | number
    ) {
        setItems((current) =>
            current.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        );
    }

    function addItem() {
        setItems((current) => [
            ...current,
            { productId: "", quantity: 1 },
        ]);
    }

    function removeItem(index: number) {
        setItems((current) => current.filter((_, i) => i !== index));
    }

    return (
        <form action={formAction} className="max-w-3xl space-y-5">
            <div>
                <label className="mb-1 block text-sm font-medium">
                    Customer
                </label>
                <select
                    name="customerId"
                    defaultValue=""
                    className="w-full rounded-lg border p-3"
                >
                    <option value="">No customer selected</option>
                    {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                            {customer.full_name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Invoice number
                </label>
                <input
                    name="invoiceNumber"
                    required
                    minLength={2}
                    maxLength={50}
                    placeholder="e.g. INV-002"
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium">
                        Issue date
                    </label>
                    <input
                        name="issueDate"
                        type="date"
                        required
                        defaultValue={new Date().toLocaleDateString("en-CA")}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">
                        Due date
                    </label>
                    <input
                        name="dueDate"
                        type="date"
                        className="w-full rounded-lg border p-3"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Invoice products</h2>
                    <button
                        type="button"
                        onClick={addItem}
                        className="rounded-lg border px-3 py-2 text-sm"
                    >
                        + Add product
                    </button>
                </div>

                {products.length === 0 && (
                    <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                        No active products found. Add a product before creating an invoice.
                    </p>
                )}

                {items.map((item, index) => {
                    const selectedProduct = products.find(
                        (product) => product.id === item.productId
                    );

                    return (
                        <div
                            key={index}
                            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-12"
                        >
                            <div className="sm:col-span-6">
                                <label className="mb-1 block text-sm font-medium">
                                    Product
                                </label>
                                <select
                                    value={item.productId}
                                    onChange={(e) =>
                                        updateItem(index, "productId", e.target.value)
                                    }
                                    required
                                    className="w-full rounded-lg border p-3"
                                >
                                    <option value="">Select a product</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                            {product.sku ? ` (${product.sku})` : ""}
                                        </option>
                                    ))}
                                </select>
                                {selectedProduct && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Unit price: {currency}{" "}
                                        {selectedProduct.price.toLocaleString()}
                                    </p>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-medium">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                    value={item.quantity}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "quantity",
                                            Number(e.target.value)
                                        )
                                    }
                                    className="w-full rounded-lg border p-3"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label className="mb-1 block text-sm font-medium">
                                    Line total
                                </label>
                                <p className="rounded-lg bg-gray-50 p-3">
                                    {currency}{" "}
                                    {(
                                        (selectedProduct?.price ?? 0) * item.quantity
                                    ).toLocaleString()}
                                </p>
                            </div>

                            <div className="flex items-end sm:col-span-1">
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    disabled={items.length === 1}
                                    className="rounded-lg border px-3 py-3 text-sm text-red-600 disabled:opacity-30"
                                    aria-label={`Remove product ${index + 1}`}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <input
                type="hidden"
                name="items"
                value={JSON.stringify(invoiceItems)}
            />

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Subtotal ({currency})
                </label>
                <p className="rounded-lg bg-gray-50 p-3 font-semibold">
                    {subtotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </p>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Discount ({currency})
                </label>
                <input
                    name="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Total ({currency})
                </label>
                <p className="rounded-lg bg-gray-50 p-3 text-lg font-bold">
                    {total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </p>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Notes (optional)
                </label>
                <textarea
                    name="notes"
                    maxLength={1000}
                    rows={3}
                    placeholder="Payment instructions or additional details"
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
                    disabled={isPending || products.length === 0 || invoiceItems.length === 0}
                    className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
                >
                    {isPending ? "Creating..." : "Create invoice"}
                </button>

                <Link
                    href="/dashboard/invoices"
                    className="rounded-lg border px-5 py-3"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}