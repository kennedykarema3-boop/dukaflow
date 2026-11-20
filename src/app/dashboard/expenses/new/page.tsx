import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExpenseForm from "../expense-form";

async function NewExpenseContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) redirect("/login");

    const { data: businesses, error: businessError } =
        await supabase.rpc("get_my_business");

    if (businessError || !businesses?.length) {
        return <p className="p-6">No business found.</p>;
    }

    return (
        <main className="space-y-6 p-6">
            <div>
                <Link
                    href="/dashboard/expenses"
                    className="text-sm text-gray-500 hover:underline"
                >
                    ← Back to expenses
                </Link>

                <h1 className="mt-3 text-2xl font-bold">Add expense</h1>
                <p className="text-sm text-gray-500">
                    Record a cost for your business.
                </p>
            </div>

            <ExpenseForm />
        </main>
    );
}

export default function NewExpensePage() {
    return (
        <Suspense fallback={<p className="p-6">Loading form...</p>}>
            <NewExpenseContent />
        </Suspense>
    );
}