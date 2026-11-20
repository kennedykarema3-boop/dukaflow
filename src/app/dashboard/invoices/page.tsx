import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function InvoicesContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) redirect("/login");

    const { data: businesses, error: businessError } =
        await supabase.rpc("get_my_business");

    const business = businesses?.[0];

    if (businessError || !business) {
        return <p className="p-6">No business found.</p>;
    }

    const { data: invoices, error } = await supabase
        .from("invoices")
        .select("*, customers(full_name)")
        .eq("business_id", business.business_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Invoices loading error:", error);
        return <p className="p-6">Could not load invoices.</p>;
    }

    const formatter = new Intl.NumberFormat("en", {
        style: "currency",
        currency: business.currency || "KES",
    });

    const totalInvoiced = (invoices ?? []).reduce(
        (sum, invoice) => sum + Number(invoice.total),
        0
    );

    return (
        <main className="space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Invoices</h1>
                    <p className="text-sm text-gray-500">
                        Create and track customer invoices.
                    </p>
                </div>

                <Link
                    href="/dashboard/invoices/new"
                    className="rounded-lg bg-black px-4 py-2 text-white"
                >
                    Create invoice
                </Link>
            </div>

            <section className="rounded-xl border p-5">
                <p className="text-sm text-gray-500">Total invoiced</p>
                <p className="mt-2 text-2xl font-bold">
                    {formatter.format(totalInvoiced)}
                </p>
            </section>

            <section className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3">Invoice</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Issue date</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {(invoices ?? []).map((invoice) => {
                            const customer = Array.isArray(invoice.customers)
                                ? invoice.customers[0]
                                : invoice.customers;

                            return (
                                <tr key={invoice.id} className="border-t">
                                    <td className="p-3">
                                        <Link
                                            href={`/dashboard/invoices/${invoice.id}`}
                                            className="font-medium text-emerald-700 underline"
                                        >
                                            {invoice.invoice_number}
                                        </Link>
                                    </td>
                                    <td className="p-3">
                                        {customer?.full_name || "No customer"}
                                    </td>
                                    <td className="p-3">{invoice.issue_date}</td>
                                    <td className="p-3 font-medium">
                                        {formatter.format(Number(invoice.total))}
                                    </td>
                                    <td className="p-3 capitalize">
                                        {invoice.status.replace("_", " ")}
                                    </td>
                                </tr>
                            );
                        })}

                        {(!invoices || invoices.length === 0) && (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-gray-500">
                                    No invoices created yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>
        </main>
    );
}

export default function InvoicesPage() {
    return (
        <Suspense fallback={<p className="p-6">Loading invoices...</p>}>
            <InvoicesContent />
        </Suspense>
    );
}