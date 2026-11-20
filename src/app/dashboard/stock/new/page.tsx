import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StockMovementForm from "./stock-movement-form";

async function StockMovementContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const {
        data: businessRows,
        error: businessError,
    } = await supabase.rpc("get_my_business");

    if (businessError || !businessRows?.length) {
        return <p className="p-6">Could not load your business.</p>;
    }

    const business = businessRows[0];

    const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("business_id", business.business_id)
        .eq("is_active", true)
        .order("name");

    if (productsError) {
        return <p className="p-6">Could not load your products.</p>;
    }

    return (
        <main className="mx-auto max-w-2xl space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold">Record Stock Movement</h1>
                <p className="text-gray-600">
                    Record stock received, stock removed, or a stock adjustment.
                </p>
            </div>

            <StockMovementForm products={products ?? []} />

            <Link href="/dashboard/stock" className="text-blue-600 underline">
                Back to Stock Management
            </Link>
        </main>
    );
}

export default function NewStockMovementPage() {
    return (
        <Suspense fallback={<p className="p-6">Loading stock form...</p>}>
            <StockMovementContent />
        </Suspense>
    );
}