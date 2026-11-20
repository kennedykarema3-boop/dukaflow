<th className="p-4 text-left">Low-stock threshold</th>
import ThresholdForm from "./threshold-form";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function InventoryContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: businessRows, error: businessError } =
        await supabase.rpc("get_my_business");

    if (businessError || !businessRows?.length) {
        console.error("Business loading error:", businessError?.message);
        return <p className="p-6">Unable to load your business.</p>;
    }

    const business = businessRows[0];

    const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("business_id", business.business_id)
        .eq("is_active", true)
        .order("name");

    const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, product_id, quantity, low_stock_threshold")
        .eq("business_id", business.business_id);

    if (productsError || inventoryError) {
        console.error("Inventory loading error:", productsError?.message, inventoryError?.message);
    }

    const stockItems = (products ?? []).map((product) => {
        const stock = (inventory ?? []).find(
            (item) => item.product_id === product.id
        );

        return {
            ...product,
            quantity: Number(stock?.quantity ?? 0),
            threshold: Number(stock?.low_stock_threshold ?? 5),
        };
    });

    const lowStockCount = stockItems.filter(
        (item) => item.quantity <= item.threshold
    ).length;

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
            <header className="flex items-center justify-between border-b border-slate-200 pb-6">
                <div>
                    <Link href="/dashboard" className="font-semibold text-emerald-700">
                        DUKAFLOW
                    </Link>
                    <p className="text-sm text-slate-500">{business.name}</p>
                </div>

                <Link
                    href="/dashboard"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                >
                    Back to dashboard
                </Link>
            </header>

            <section className="py-10">
                <h1 className="text-3xl font-bold">Inventory</h1>
                <p className="mt-2 text-slate-600">
                    Monitor available stock in your business.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border bg-white p-6">
                        <p className="text-sm text-slate-500">Products tracked</p>
                        <p className="mt-2 text-3xl font-bold">{stockItems.length}</p>
                    </div>

                    <div className="rounded-xl border bg-white p-6">
                        <p className="text-sm text-slate-500">Low-stock products</p>
                        <p className="mt-2 text-3xl font-bold text-amber-600">
                            {lowStockCount}
                        </p>
                    </div>
                </div>

                <div className="mt-8 overflow-x-auto rounded-xl border bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="p-4">Product</th>
                                <th className="p-4">SKU</th>
                                <th className="p-4">Available stock</th>
                                <th className="p-4">Stock status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {stockItems.length > 0 ? (
                                stockItems.map((item) => {
                                    const lowStock = item.quantity <= item.threshold;

                                    return (
                                        <tr key={item.id} className="border-t">
                                            <td className="p-4 font-medium">{item.name}</td>
                                            <td className="p-4">{item.sku || "—"}</td>
                                            <td className="p-4 font-semibold">
                                                {item.quantity}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={
                                                        lowStock
                                                            ? "rounded-full bg-amber-50 px-3 py-1 text-amber-700"
                                                            : "rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"
                                                    }
                                                >
                                                    {lowStock ? "Low stock" : "In stock"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <ThresholdForm
                                                    productId={item.id}
                                                    threshold={item.threshold}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">
                                        No active products yet. Add a product first.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<p className="p-6">Loading inventory...</p>}>
            <InventoryContent />
        </Suspense>
    );
}