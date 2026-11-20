import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type StockMovement = {
    id: string;
    movement_type: string;
    quantity: number;
    reference: string | null;
    notes: string | null;
    created_at: string;
    products:
        | { name: string; sku: string | null }
        | { name: string; sku: string | null }[]
        | null;
};

async function StockContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) redirect("/login");

    const { data: businessRows, error: businessError } =
        await supabase.rpc("get_my_business");

    if (businessError || !businessRows?.length) {
        return <p className="p-6">Could not load your business.</p>;
    }

    const business = businessRows[0];

    const { data: movements, error } = await supabase
        .from("stock_movements")
        .select(`
      id,
      movement_type,
      quantity,
      reference,
      notes,
      created_at,
      products ( name, sku )
    `)
        .eq("business_id", business.business_id)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Stock history error:", error);
    }

    return (
        <main className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold">Stock Management</h1>
                <p className="text-gray-600">
                    Record stock received and stock removed from your business.
                </p>
            </div>

            <div className="flex flex-wrap gap-3">
                <Link
                    href="/dashboard/stock/new"
                    className="rounded-lg bg-blue-600 px-5 py-3 text-white"
                >
                    Record Stock Movement
                </Link>

                <Link
                    href="/dashboard/inventory"
                    className="rounded-lg border px-5 py-3"
                >
                    View Inventory
                </Link>
            </div>

            <section className="rounded-xl border p-4">
                <h2 className="mb-4 text-lg font-semibold">Recent Stock Movements</h2>

                {!movements?.length ? (
                    <p className="text-gray-500">No stock movements recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-3">Product</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Quantity</th>
                                    <th className="p-3">Reference</th>
                                    <th className="p-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(movements as StockMovement[]).map((movement) => (
                                    <tr key={movement.id} className="border-b">
                                        <td className="p-3">
                                            {Array.isArray(movement.products)
                                                ? movement.products[0]?.name
                                                : movement.products?.name}
                                        </td>
                                        <td className="p-3">
                                            {movement.movement_type.replace("_", " ")}
                                        </td>
                                        <td className="p-3">{movement.quantity}</td>
                                        <td className="p-3">{movement.reference || "—"}</td>
                                        <td className="p-3">
                                            {new Date(movement.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}

export default function StockPage() {
    return (
        <Suspense fallback={<p className="p-6">Loading stock management...</p>}>
            <StockContent />
        </Suspense>
    );
}
