import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function CustomersContent() {
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

    const { data: customers, error } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business.business_id)
        .order("created_at", { ascending: false });

    if (error) {
        return <p className="p-6">Could not load customers.</p>;
    }

    return (
        <main className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Customers</h1>
                    <p className="mt-1 text-gray-500">
                        Manage your business customers.
                    </p>
                </div>

                <a
                    href="/dashboard/customers/new"
                    className="rounded-lg bg-black px-5 py-3 text-white"
                >
                    Add customer
                </a>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Phone</th>
                            <th className="p-4">Email</th>
                        </tr>
                    </thead>

                    <tbody>
                        {customers?.map((customer) => (
                            <tr key={customer.id} className="border-t">
                                <td className="p-4 font-medium">
                                    {customer.full_name}
                                </td>
                                <td className="p-4">
                                    {customer.phone || "—"}
                                </td>
                                <td className="p-4">
                                    {customer.email || "—"}
                                </td>
                            </tr>
                        ))}

                        {customers?.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-6 text-center text-gray-500">
                                    No customers yet. Add your first customer.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}

export default function CustomersPage() {
    return (
        <Suspense fallback={<p className="p-6">Loading customers...</p>}>
            <CustomersContent />
        </Suspense>
    );
}