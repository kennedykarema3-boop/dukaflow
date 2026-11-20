import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function ProductsContent() {
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

    if (businessError) {
        console.error("Business loading error:", businessError.message);
        return <p className="p-6">Unable to load your business.</p>;
    }

    const business = businessRows?.[0];

    if (!business) {
        redirect("/onboarding");
    }

    const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, sku, price, cost_price, is_active, created_at")
        .eq("business_id", business.business_id)
        .order("created_at", { ascending: false });

    if (productsError) {
        console.error("Products loading error:", productsError.message);
    }

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
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Products</h1>
                        <p className="mt-2 text-slate-600">
                            Manage the products sold by your business.
                        </p>
                    </div>

                    <Link
                        href="/dashboard/products/new"
                        className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                    >
                        + Add product
                    </Link>
                </div>

                {productsError && (
                    <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
                        Unable to load products. Please refresh the page.
                    </p>
                )}

                <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="p-4">Product</th>
                                <th className="p-4">SKU</th>
                                <th className="p-4">Selling price</th>
                                <th className="p-4">Cost price</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products && products.length > 0 ? (
                                products.map((product) => (
                                    <tr key={product.id} className="border-t">
                                        <td className="p-4 font-medium">{product.name}</td>
                                        <td className="p-4">{product.sku || "—"}</td>
                                        <td className="p-4">
                                            {business.currency} {Number(product.price).toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            {business.currency} {Number(product.cost_price).toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            {product.is_active ? "Active" : "Inactive"}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No products yet. Click Add product to create your first one.
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

export default function ProductsPage() {
    return (
        <Suspense fallback={<p className="p-6">Loading products...</p>}>
            <ProductsContent />
        </Suspense>
    );
}