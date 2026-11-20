import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InvoiceForm from "../invoice-form";

async function NewInvoiceContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) redirect("/login");

    const { data: businesses, error: businessError } =
        await supabase.rpc("get_my_business");

    const business = businesses?.[0];

    if (businessError || !business) {
        return <p className="p-6">No business found.</p>;
    }

    const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("business_id", business.business_id)
        .order("full_name");

    if (customersError) {
        console.error("Customers loading error:", customersError);
        return <p className="p-6">Could not load customers.</p>;
    }

    const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, sku, price")
        .eq("business_id", business.business_id)
        .eq("is_active", true)
        .order("name");

    if (productsError) {
        console.error("Products loading error:", productsError);
        return <p className="p-6">Could not load products.</p>;
    }

    return (
        <main className="space-y-6 p-6">
            <div>
                <Link
                    href="/dashboard/invoices"
                    className="text-sm text-gray-500 hover:underline"
                >
                    ← Back to invoices
                </Link>

                <h1 className="mt-3 text-2xl font-bold">Create invoice</h1>

                <p className="text-sm text-gray-500">
                    Prepare a draft invoice for your customer.
                </p>

                <InvoiceForm
                    customers={customers ?? []}
                    products={products ?? []}
                    currency={business.currency}
                />
            </div>
        </main>
    );
}

export default function NewInvoicePage() {
    return (
        <Suspense fallback={<p className="p-6">Loading invoice form...</p>}>
            <NewInvoiceContent />
        </Suspense>
    );
}