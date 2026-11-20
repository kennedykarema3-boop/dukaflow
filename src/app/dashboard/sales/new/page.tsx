import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SaleForm from "../sale-form";

async function NewSaleContent() {
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
        return <p className="p-6">No business workspace found.</p>;
    }

    const business = businessRows[0];

    const [productsResult, customersResult] = await Promise.all([
        supabase
            .from("products")
            .select("id, name, sku, price")
            .eq("business_id", business.business_id)
            .eq("is_active", true)
            .order("name"),

        supabase
            .from("customers")
            .select("id, full_name")
            .eq("business_id", business.business_id)
            .order("full_name"),
    ]);

    if (productsResult.error || customersResult.error) {
        return <p className="p-6">Could not load sale information.</p>;
    }

    return (
        <SaleForm
            products={productsResult.data ?? []}
            customers={customersResult.data ?? []}
            currency={business.currency}
        />
    );
}

export default function NewSalePage() {
    return (
        <Suspense fallback={<p className="p-6">Loading sale form...</p>}>
            <NewSaleContent />
        </Suspense>
    );
}