import Link from "next/link";
import Image from "next/image";
import PrintButton from "../../invoices/print-button";
import PaymentForm from "../payment-form";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
    params: Promise<{ id: string }>;
};

async function SaleDetailsContent({ params }: Props) {
    await connection();

    const { id } = await params;
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

    // Load business branding and contact information
    const { data: profileRows, error: profileError } =
        await supabase.rpc("get_my_business_profile");

    if (profileError) {
        console.error("Business profile loading error:", profileError);
    }

    const profile = profileRows?.[0];

    const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select(`
            id,
            sale_number,
            subtotal,
            discount,
            total,
            amount_paid,
            payment_status,
            notes,
            created_at,
            customers ( full_name, phone, email )
        `)
        .eq("id", id)
        .eq("business_id", business.business_id)
        .maybeSingle();

    if (saleError) {
        console.error("Sale loading error:", saleError);
        return (
            <p className="p-6 text-red-600">
                Could not load sale details: {saleError.message}
            </p>
        );
    }

    if (!sale) notFound();

    const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
            id,
            product_name,
            quantity,
            unit_price,
            line_total
        `)
        .eq("sale_id", sale.id)
        .eq("business_id", business.business_id);

    if (itemsError) {
        return <p className="p-6">Could not load sale items.</p>;
    }

    // Load payment history for this sale
    const { data: payments, error: paymentsError } = await supabase
        .from("sale_payments")
        .select("id, amount, notes, created_at")
        .eq("sale_id", sale.id)
        .eq("business_id", business.business_id)
        .order("created_at", { ascending: false });

    if (paymentsError) {
        console.error("Payment history loading error:", paymentsError);
    }

    const customer = Array.isArray(sale.customers)
        ? sale.customers[0]
        : sale.customers;

    const money = (amount: number) =>
        new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: business.currency,
        }).format(Number(amount));

    const amountPaid = Number(sale.amount_paid ?? 0);
    const balance = Math.max(0, Number(sale.total) - amountPaid);

    return (
        <main className="mx-auto max-w-4xl p-6">
            <Link
                href="/dashboard/sales"
                className="text-sm text-gray-500 underline print:hidden"
            >
                ← Back to sales
            </Link>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold">Sale details</h1>
                    <p className="mt-1 text-gray-500">{sale.sale_number}</p>
                </div>

                <span className="rounded-full bg-emerald-50 px-4 py-2 font-medium capitalize text-emerald-700">
                    {sale.payment_status}
                </span>
            </div>

            {/* Business branding - included on printed receipt */}
            <section className="mt-6 border-b pb-6 text-center">
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

                <h2 className="mt-5 text-xl font-semibold">
                    SALES RECEIPT
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                    Receipt: {sale.sale_number}
                </p>
            </section>

            <section className="mt-6 rounded-xl border p-5">
                <h2 className="font-semibold">Sale information</h2>

                <p className="mt-3 text-sm text-gray-600">
                    Date: {new Date(sale.created_at).toLocaleString()}
                </p>

                <p className="mt-2 text-sm text-gray-600">
                    Customer: {customer?.full_name || "Walk-in customer"}
                </p>

                {customer?.phone && (
                    <p className="mt-2 text-sm text-gray-600">
                        Phone: {customer.phone}
                    </p>
                )}

                {customer?.email && (
                    <p className="mt-2 text-sm text-gray-600">
                        Email: {customer.email}
                    </p>
                )}

                {sale.notes && (
                    <p className="mt-2 text-sm text-gray-600">
                        Notes: {sale.notes}
                    </p>
                )}
            </section>

            <section className="mt-6 overflow-x-auto rounded-xl border">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4">Product</th>
                            <th className="p-4">Quantity</th>
                            <th className="p-4">Unit price</th>
                            <th className="p-4">Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items?.map((item) => (
                            <tr key={item.id} className="border-t">
                                <td className="p-4 font-medium">
                                    {item.product_name}
                                </td>
                                <td className="p-4">{item.quantity}</td>
                                <td className="p-4">
                                    {money(item.unit_price)}
                                </td>
                                <td className="p-4 font-semibold">
                                    {money(item.line_total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="mt-6 ml-auto max-w-sm rounded-xl bg-gray-50 p-5">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{money(sale.subtotal)}</span>
                </div>

                <div className="mt-2 flex justify-between">
                    <span>Discount</span>
                    <span>{money(sale.discount)}</span>
                </div>

                <div className="mt-4 flex justify-between border-t pt-4 font-bold">
                    <span>Total</span>
                    <span>{money(sale.total)}</span>
                </div>

                <div className="mt-3 flex justify-between text-green-700">
                    <span>Amount received</span>
                    <span>{money(amountPaid)}</span>
                </div>

                <div className="mt-3 flex justify-between border-t pt-3 text-lg font-bold text-red-700">
                    <span>Outstanding balance</span>
                    <span>{money(balance)}</span>
                </div>
            </section>

            {/* Payment history */}
            <section className="mt-6 rounded-xl border p-5 print:hidden">
                <h2 className="text-lg font-semibold">Payment history</h2>
                <p className="mt-1 text-sm text-gray-500">
                    All payments received for this sale.
                </p>

                {paymentsError ? (
                    <p className="mt-4 text-sm text-red-600">
                        Could not load payment history.
                    </p>
                ) : !payments || payments.length === 0 ? (
                    <p className="mt-4 text-sm text-gray-500">
                        No additional payments have been recorded yet.
                    </p>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="border-t">
                                        <td className="p-3">
                                            {new Date(payment.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-3 font-semibold text-green-700">
                                            {money(payment.amount)}
                                        </td>
                                        <td className="p-3">
                                            {payment.notes || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="mt-6 rounded-xl border p-5 print:hidden">
                <h2 className="text-lg font-semibold">
                    Record additional payment
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Record money received from the customer against this sale.
                </p>

                <PaymentForm
                    saleId={sale.id}
                    balance={balance}
                    currency={business.currency}
                />
            </section>

            <div className="mt-6 print:hidden">
                <PrintButton />
            </div>

            <p className="mt-8 text-center text-sm text-gray-500">
                Thank you for your business!
            </p>
        </main>
    );
}

export default function SaleDetailsPage({ params }: Props) {
    return (
        <Suspense fallback={<p className="p-6">Loading sale details...</p>}>
            <SaleDetailsContent params={params} />
        </Suspense>
    );
}
