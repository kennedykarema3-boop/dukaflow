
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Customer = {
    full_name: string | null;
};

type Sale = {
    id: string;
    sale_number: string;
    subtotal: number | string | null;
    discount: number | string | null;
    total: number | string | null;
    payment_status: string;
    created_at: string;
    customers: Customer | Customer[] | null;
};

async function SalesContent() {
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

    const { data: salesData, error } = await supabase
        .from("sales")
        .select(`
            id,
            sale_number,
            subtotal,
            discount,
            total,
            payment_status,
            created_at,
            customers ( full_name )
        `)
        .eq("business_id", business.business_id)
        .order("created_at", { ascending: false });

    if (error) {
        return <p className="p-6">Could not load sales.</p>;
    }

    const sales = (salesData ?? []) as Sale[];

    const money = (amount: number | string | null) =>
        new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: business.currency,
        }).format(Number(amount ?? 0));

    return (
        <main className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Sales</h1>
                    <p className="mt-1 text-gray-500">
                        View and manage your business sales.
                    </p>
                </div>

                <Link
                    href="/dashboard/sales/new"
                    className="rounded-lg bg-black px-5 py-3 text-white"
                >
                    + New sale
                </Link>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4">Sale number</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Total</th>
                            <th className="p-4">Payment</th>
                            <th className="p-4">Date</th>
                        </tr>
                    </thead>

                    <tbody>
                        {sales.map((sale) => {
                            const customer = Array.isArray(sale.customers)
                                ? sale.customers[0]
                                : sale.customers;

                            return (
                                <tr key={sale.id} className="border-t">
                                    <td className="p-4 font-medium">
                                        <Link
                                            href={`/dashboard/sales/${sale.id}`}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {sale.sale_number}
                                        </Link>
                                    </td>

                                    <td className="p-4">
                                        {customer?.full_name || "Walk-in customer"}
                                    </td>

                                    <td className="p-4 font-semibold">
                                        {money(sale.total)}
                                    </td>

                                    <td className="p-4 capitalize">
                                        {sale.payment_status}
                                    </td>

                                    <td className="p-4">
                                        {new Date(sale.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            );
                        })}

                        {sales.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="p-6 text-center text-gray-500"
                                >
                                    No sales recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}

export default function SalesPage() {
    return (
        <Suspense fallback={<p className="p-6">Loading sales...</p>}>
            <SalesContent />
        </Suspense>
    );
}
