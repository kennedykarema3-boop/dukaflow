import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function ExpensesContent() {
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

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("business_id", business.business_id)
    .order("expense_date", { ascending: false });

  if (error) {
    return <p className="p-6">Could not load expenses.</p>;
  }

  const totalExpenses = (expenses ?? []).reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: business.currency || "KES",
  });

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-gray-500">
            Track your business costs.
          </p>
        </div>

        <Link
          href="/dashboard/expenses/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Add expense
        </Link>
      </div>

      <section className="rounded-xl border p-5">
        <p className="text-sm text-gray-500">Total expenses</p>
        <p className="mt-2 text-2xl font-bold">
          {formatter.format(totalExpenses)}
        </p>
      </section>

      <section className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3">Category</th>
              <th className="p-3">Amount</th>
            </tr>
          </thead>

          <tbody>
            {(expenses ?? []).map((expense) => (
              <tr key={expense.id} className="border-t">
                <td className="p-3">{expense.expense_date}</td>
                <td className="p-3">{expense.description}</td>
                <td className="p-3">{expense.category}</td>
                <td className="p-3 font-medium">
                  {formatter.format(Number(expense.amount))}
                </td>
              </tr>
            ))}

            {(!expenses || expenses.length === 0) && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading expenses...</p>}>
      <ExpensesContent />
    </Suspense>
  );
}
