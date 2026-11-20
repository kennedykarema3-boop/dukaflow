
import PaymentForm from "../payment-form";
import PrintButton from "../../invoices/print-button";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

type Props = {
    params: Promise<{ id: string }>;
};

async function InvoiceDetailsContent({ params }: Props) {
    await connection();

    const { id } = await params;
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

    // Load business branding and contact information
    const { data: profileRows, error: profileError } =
        await supabase.rpc("get_my_business_profile");

    if (profileError) {
        console.error("Business profile loading error:", profileError);
    }

    const profile = profileRows?.[0];

    const { data: invoice, error } = await supabase
        .from("invoices")
        .select("*, customers(full_name, phone, email, address)")
        .eq("id", id)
        .eq("business_id", business.business_id)
        .maybeSingle();

    const { data: invoiceItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select("id, product_name, quantity, unit_price, line_total")
        .eq("invoice_id", id)
        .eq("business_id", business.business_id)
        .order("created_at");

    if (itemsError) {
        console.error("Invoice items loading error:", itemsError);
    }

    if (error) {
        console.error("Invoice loading error:", error);
        return <p className="p-6">Could not load invoice.</p>;
    }

    if (!invoice) notFound();

    const customer = Array.isArray(invoice.customers)
        ? invoice.customers[0]
        : invoice.customers;

    const formatter = new Intl.NumberFormat("en", {
        style: "currency",
        currency: business.currency || "KES",
    });

    const balance = Math.max(
        0,
        Number(invoice.total) - Number(invoice.amount_paid)
    );

    return (
        <main className="mx-auto max-w-3xl space-y-6 p-6">
            <Link
                href="/dashboard/invoices"
                className="text-sm text-gray-500 hover:underline print:hidden"
            >
                ← Back to invoices
            </Link>

            {/* Business branding - included on printed invoice */}
            <section className="border-b pb-6 text-center">
                {profile?.logo_url && (
                    <Image
                        src={profile.logo_url}
                        alt={`${profile.name || business.name} logo`}
                        width={160}
                        height={96}
                        className="mx-auto mb-3 max-h-24 max-w-40 object-contain"
                    />
                )}

                <h1 className="text-2xl font-bold">
                    {profile?.name || business.name}
                </h1>

                {profile?.address && (
                    <p className="mt-1 text-sm text-gray-600">
                        {profile.address}
                    </p>
                )}

                {profile?.phone && (
                    <p className="mt-1 text-sm text-gray-600">
                        Phone: {profile.phone}
                    </p>
                )}

                {profile?.email && (
                    <p className="mt-1 text-sm text-gray-600">
                        Email: {profile.email}
                    </p>
                )}
            </section>

            <section className="rounded-xl border bg-white p-6">
                <div className="flex flex-wrap justify-between gap-4">
                    <div>
                        <p className="font-semibold text-emerald-700">DUKAFLOW</p>
                        <h2 className="mt-3 text-2xl font-bold">Invoice</h2>
                        <p className="mt-1 text-gray-500">
                            {invoice.invoice_number}
                        </p>
                    </div>

                    <span className="h-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-medium capitalize text-amber-800 print:hidden">
                        {invoice.status.replace("_", " ")}
                    </span>
                </div>

                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                    <div>
                        <p className="text-sm text-gray-500">Bill to</p>
                        <p className="mt-1 font-semibold">
                            {customer?.full_name || "No customer selected"}
                        </p>
                        {customer?.phone && <p className="text-sm">{customer.phone}</p>}
                        {customer?.email && <p className="text-sm">{customer.email}</p>}
                        {customer?.address && <p className="text-sm">{customer.address}</p>}
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Issue date</p>
                        <p className="font-medium">{invoice.issue_date}</p>

                        <p className="mt-3 text-sm text-gray-500">Due date</p>
                        <p className="font-medium">{invoice.due_date || "Not set"}</p>
                    </div>
                </div>

                <div className="mt-6">
                    <h2 className="mb-3 text-lg font-semibold">Invoice items</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="p-3">Product</th>
                                    <th className="p-3">Quantity</th>
                                    <th className="p-3">Unit price</th>
                                    <th className="p-3">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoiceItems ?? []).map((item) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-3">{item.product_name}</td>
                                        <td className="p-3">{item.quantity}</td>
                                        <td className="p-3">{formatter.format(Number(item.unit_price))}</td>
                                        <td className="p-3">{formatter.format(Number(item.line_total))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 border-t pt-5">
                    <div className="flex justify-between py-2">
                        <span className="text-gray-600">Subtotal</span>
                        <span>{formatter.format(Number(invoice.subtotal))}</span>
                    </div>

                    <div className="flex justify-between py-2">
                        <span className="text-gray-600">Discount</span>
                        <span>{formatter.format(Number(invoice.discount))}</span>
                    </div>

                    <div className="mt-3 flex justify-between border-t pt-4 text-lg font-bold">
                        <span>Total</span>
                        <span>{formatter.format(Number(invoice.total))}</span>
                    </div>

                    <div className="mt-3 flex justify-between text-sm">
                        <span className="text-gray-500">Amount paid</span>
                        <span>{formatter.format(Number(invoice.amount_paid))}</span>
                    </div>

                    <div className="mt-2 flex justify-between text-sm font-semibold">
                        <span>Balance due</span>
                        <span>{formatter.format(balance)}</span>
                    </div>

                    <div className="mt-6 print:hidden">
                        <PaymentForm
                            invoiceId={invoice.id}
                            balance={balance}
                            currency={business.currency}
                        />
                    </div>
                </div>

                {invoice.notes && (
                    <div className="mt-6 border-t pt-4">
                        <p className="text-sm font-semibold">Notes</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                            {invoice.notes}
                        </p>
                    </div>
                )}
            </section>

            <div className="print:hidden">
                <PrintButton />
            </div>

            <p className="text-center text-sm text-gray-500">
                Thank you for your business!
            </p>
        </main>
    );
}

export default function InvoiceDetailsPage(props: Props) {
    return (
        <Suspense fallback={<p className="p-6">Loading invoice...</p>}>
            <InvoiceDetailsContent {...props} />
        </Suspense>
    );
}
