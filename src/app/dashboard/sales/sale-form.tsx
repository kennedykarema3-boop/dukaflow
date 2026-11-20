
"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { createSale } from "@/app/actions/sales";

type Product = {
    id: string;
    name: string;
    sku: string | null;
    price: number;
};

type Customer = {
    id: string;
    full_name: string;
};

type SaleItem = {
    productId: string;
    quantity: number;
};

const initialState = { error: "" };

export default function SaleForm({
    products,
    customers,
    currency,
}: {
    products: Product[];
    customers: Customer[];
    currency: string;
}) {
    const [items, setItems] = useState<SaleItem[]>([]);
    const [discount, setDiscount] = useState("0");
    const [amountPaid, setAmountPaid] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("paid");

    const [state, formAction, isPending] = useActionState(
        async (_previousState: typeof initialState, formData: FormData) => {
            return (await createSale(formData)) ?? initialState;
        },
        initialState
    );

    function addItem() {
        if (products.length === 0) return;
        setItems([...items, { productId: products[0].id, quantity: 1 }]);
    }

    function updateItem(index: number, changes: Partial<SaleItem>) {
        setItems((current) =>
            current.map((item, i) =>
                i === index ? { ...item, ...changes } : item
            )
        );
    }

    function removeItem(index: number) {
        setItems((current) => current.filter((_, i) => i !== index));
    }

    const subtotal = items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + (Number(product?.price ?? 0) * item.quantity);
    }, 0);

    const discountAmount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal - discountAmount);
    const paidAmount =
        paymentStatus === "paid"
            ? total
            : paymentStatus === "unpaid"
                ? 0
                : Math.min(Math.max(0, Number(amountPaid) || 0), total);

    const balance = Math.max(0, total - paidAmount);

    const money = (amount: number) =>
        new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
        }).format(amount);

    return (
        <main className="mx-auto max-w-3xl p-6">
            <Link
                href="/dashboard/sales"
                className="text-sm text-gray-500 underline"
            >
                ← Back to sales
            </Link>
            <h1 className="mt-5 text-2xl font-bold">Create sale</h1>
            <p className="mt-1 text-gray-500">
                Select products and record a customer sale.
            </p>

            {products.length === 0 ? (
                <p className="mt-6 rounded-lg bg-amber-50 p-4 text-amber-800">
                    You need to add an active product before recording a sale.
                </p>
            ) : (
                <form action={formAction} className="mt-6 space-y-6">
                    <div>
                        <label className="mb-2 block font-medium">Customer</label>
                        <select
                            name="customerId"
                            className="w-full rounded-lg border p-3"
                            defaultValue=""
                        >
                            <option value="">Walk-in customer</option>
                            {customers.map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Products</h2>
                            <button
                                type="button"
                                onClick={addItem}
                                className="rounded-lg border px-4 py-2"
                            >
                                + Add product
                            </button>
                        </div>

                        {items.map((item, index) => {
                            const selectedProduct = products.find(
                                (product) => product.id === item.productId
                            );

                            return (
                                <div
                                    key={index}
                                    className="rounded-xl border p-4"
                                >
                                    <label className="mb-2 block text-sm font-medium">
                                        Product
                                    </label>

                                    <select
                                        value={item.productId}
                                        onChange={(e) =>
                                            updateItem(index, { productId: e.target.value })
                                        }
                                        className="w-full rounded-lg border p-3"
                                    >
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name}
                                                {product.sku ? ` (${product.sku})` : ""}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="mt-3 flex items-end gap-3">
                                        <div className="flex-1">
                                            <label className="mb-2 block text-sm font-medium">
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                required
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateItem(index, {
                                                        quantity: Number(e.target.value),
                                                    })
                                                }
                                                className="w-full rounded-lg border p-3"
                                            />
                                        </div>

                                        <div className="flex-1">
                                            <p className="text-sm text-gray-500">Unit price</p>
                                            <p className="mt-2 font-semibold">
                                                {money(Number(selectedProduct?.price ?? 0))}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="rounded-lg border px-3 py-3 text-red-600"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {items.length === 0 && (
                            <p className="rounded-lg bg-gray-50 p-4 text-gray-500">
                                No products added yet.
                            </p>
                        )}
                    </section>

                    <input
                        type="hidden"
                        name="items"
                        value={JSON.stringify(
                            items.map((item) => ({
                                product_id: item.productId,
                                quantity: item.quantity,
                            }))
                        )}
                    />

                    <div>
                        <label className="mb-2 block font-medium">Discount</label>
                        <input
                            name="discount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            className="w-full rounded-lg border p-3"
                        />
                    </div>

                    <div>
                            <div>
                                <label className="mb-2 block font-medium">
                                    Payment status
                                </label>

                                <select
                                    name="paymentStatus"
                                    value={paymentStatus}
                                    onChange={(e) => {
                                        setPaymentStatus(e.target.value);
                                        setAmountPaid("");
                                    }}
                                    className="w-full rounded-lg border p-3"
                                >
                                    <option value="paid">Paid</option>
                                    <option value="partial">Partially paid</option>
                                    <option value="unpaid">Unpaid</option>
                                </select>
                            </div>

                            {paymentStatus === "partial" && (
                                <div>
                                    <label className="mb-2 block font-medium">
                                        Amount received ({currency})
                                    </label>

                                    <input
                                        name="amountPaid"
                                        type="number"
                                        min="0.01"
                                        max={total - 0.01}
                                        step="0.01"
                                        required
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        className="w-full rounded-lg border p-3"
                                        placeholder="Enter amount received"
                                    />
                                </div>
                            )}
                        <select
                            name="paymentStatus"
                            className="w-full rounded-lg border p-3"
                            defaultValue="paid"
                        >
                            <option value="paid">Paid</option>
                            <option value="partial">Partially paid</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block font-medium">Notes</label>
                        <textarea
                            name="notes"
                            rows={3}
                            maxLength={1000}
                            className="w-full rounded-lg border p-3"
                            placeholder="Optional sale notes"
                        />
                    </div>

                    <div className="rounded-xl bg-gray-50 p-5">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{money(subtotal)}</span>
                        </div>
                        <div className="mt-2 flex justify-between">
                            <span>Discount</span>
                            <span>{money(discountAmount)}</span>
                        </div>
                        <div className="mt-3 flex justify-between border-t pt-3 text-lg font-bold">
                            <span>Total</span>
                            <span>{money(total)}</span>
                        </div>
                            <div className="mt-3 flex justify-between">
                                <span>Amount received</span>
                                <span>{money(paidAmount)}</span>
                            </div>

                            <div className="mt-2 flex justify-between font-semibold">
                                <span>Outstanding balance</span>
                                <span>{money(balance)}</span>
                            </div>
                    </div>

                    {state.error && (
                        <p className="rounded-lg bg-red-50 p-3 text-red-700">
                            {state.error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isPending || items.length === 0 || discountAmount > subtotal}
                        className="w-full rounded-lg bg-black px-6 py-3 font-medium text-white disabled:opacity-50"
                    >
                        {isPending ? "Recording sale..." : "Complete sale"}
                    </button>
                </form>
            )}
        </main>
    );
}