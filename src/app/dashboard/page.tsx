
import Link from "next/link";
import SalesChart from "@/components/sales-chart";
import ExpensesChart from "@/components/expenses-chart";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

type SaleRow = {
  id: string;
  sale_number?: string;
  total: number | string | null;
  amount_paid?: number | string | null;
  payment_status?: string;
  created_at: string;
};

type ExpenseRow = {
  amount: number | string | null;
  created_at: string;
};

type ChartSale = {
  total: number | string | null;
  created_at: string;
};

type InventoryRow = {
  id: string;
  quantity: number | string;
  low_stock_threshold: number | string;
  products:
  | { name: string | null }
  | { name: string | null }[]
  | null;
};

async function DashboardContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const name =
    user.user_metadata?.full_name ?? user.email ?? "there";

  const { data: businessRows, error: businessError } =
    await supabase.rpc("get_my_business");

  if (businessError) {
    console.error("Business loading error:", businessError.message);
  }

  const business = businessRows?.[0] ?? null;

  const [salesResult, expensesResult] = business
    ? await Promise.all([
      supabase
        .from("sales")
        .select("total, amount_paid, id, created_at")
        .eq("business_id", business.business_id),

      supabase
        .from("expenses")
        .select("amount, created_at")
        .eq("business_id", business.business_id),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];

  const sales = (salesResult.data ?? []) as SaleRow[];
  const expenses = (expensesResult.data ?? []) as ExpenseRow[];

  if (salesResult.error) {
    console.error("Sales loading error:", salesResult.error.message);
  }

  if (expensesResult.error) {
    console.error("Expenses loading error:", expensesResult.error.message);
  }

  // Prepare the last 90 days for both charts.
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
  ninetyDaysAgo.setHours(0, 0, 0, 0);

  const { data: chartSalesData, error: chartSalesError } = business
    ? await supabase
      .from("sales")
      .select("total, created_at")
      .eq("business_id", business.business_id)
      .gte("created_at", ninetyDaysAgo.toISOString())
    : { data: [], error: null };

  if (chartSalesError) {
    console.error("Sales chart loading error:", chartSalesError.message);
  }

  const chartSales = (chartSalesData ?? []) as ChartSale[];

  const salesChartData = Array.from({ length: 90 }, (_, index) => {
    const date = new Date(ninetyDaysAgo);
    date.setDate(date.getDate() + index);

    const daySales = chartSales
      .filter((sale) => {
        const saleDate = new Date(sale.created_at);
        return saleDate.toDateString() === date.toDateString();
      })
      .reduce(
        (sum, sale) => sum + Number(sale.total ?? 0),
        0
      );

    return {
      day: date.toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
      }),
      total: daySales,
    };
  });

  const expensesChartData = Array.from({ length: 90 }, (_, index) => {
    const date = new Date(ninetyDaysAgo);
    date.setDate(date.getDate() + index);

    const dayExpenses = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.created_at);
        return expenseDate.toDateString() === date.toDateString();
      })
      .reduce(
        (sum, expense) => sum + Number(expense.amount ?? 0),
        0
      );

    return {
      day: date.toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
      }),
      total: dayExpenses,
    };
  });

  const totalSales = sales.reduce(
    (sum, sale) => sum + Number(sale.total ?? 0),
    0
  );

  const totalCollected = sales.reduce(
    (sum, sale) => sum + Number(sale.amount_paid ?? 0),
    0
  );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
    0
  );

  const estimatedProfit = totalCollected - totalExpenses;

  const { data: lowStockData, error: lowStockError } = business
    ? await supabase
      .from("inventory")
      .select(`
          id,
          quantity,
          low_stock_threshold,
          products ( name )
        `)
      .eq("business_id", business.business_id)
      .order("quantity", { ascending: true })
    : { data: [], error: null };

  if (lowStockError) {
    console.error("Low stock alert error:", lowStockError.message);
  }

  const lowStockItems = (lowStockData ?? []) as InventoryRow[];

  const lowStockAlerts = lowStockItems.filter(
    (item) =>
      Number(item.quantity) <= Number(item.low_stock_threshold)
  );

  const { data: recentSalesData, error: recentSalesError } = business
    ? await supabase
      .from("sales")
      .select("id, sale_number, total, payment_status, created_at")
      .eq("business_id", business.business_id)
      .order("created_at", { ascending: false })
      .limit(5)
    : { data: [], error: null };

  if (recentSalesError) {
    console.error("Recent sales loading error:", recentSalesError.message);
  }

  const recentSales = (recentSalesData ?? []) as SaleRow[];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <p className="font-semibold text-emerald-700">DUKAFLOW</p>
          <p className="text-sm text-slate-500">Business workspace</p>
        </div>

        <form action={logout}>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">
            Sign out
          </button>
        </form>
      </header>

      <section className="py-12">
        <p className="text-sm font-medium text-emerald-700">
          YOUR WORKSPACE
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Welcome, {name}
        </h1>

        {business ? (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Total sales</p>
                <h3 className="mt-2 text-2xl font-bold">
                  {business.currency} {totalSales.toLocaleString()}
                </h3>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Collected payments</p>
                <h3 className="mt-2 text-2xl font-bold text-emerald-700">
                  {business.currency} {totalCollected.toLocaleString()}
                </h3>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Total expenses</p>
                <h3 className="mt-2 text-2xl font-bold text-red-600">
                  {business.currency} {totalExpenses.toLocaleString()}
                </h3>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Cash-flow estimate</p>
                <h3
                  className={`mt-2 text-2xl font-bold ${estimatedProfit >= 0
                      ? "text-emerald-700"
                      : "text-red-600"
                    }`}
                >
                  {business.currency} {estimatedProfit.toLocaleString()}
                </h3>
              </div>
            </div>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-5">
                <h2 className="text-xl font-semibold">
                  Sales performance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Daily sales over the last 90 days
                </p>
              </div>

              <SalesChart data={salesChartData} />
            </section>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-5">
                <h2 className="text-xl font-semibold">
                  Expenses performance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Daily expenses over the last 90 days
                </p>
              </div>

              <ExpensesChart
                data={expensesChartData}
                currency={business.currency}
              />
            </section>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8">
              <h2 className="text-2xl font-semibold">
                {business.name}
              </h2>

              <p className="mt-2 text-slate-600">
                {business.country_code} · {business.currency} ·{" "}
                {business.business_type}
              </p>

              <p className="mt-4 text-sm text-emerald-700">
                Your business workspace is active.
              </p>

              <nav className="mt-6 flex flex-wrap gap-3">
                <Link href="/dashboard/products" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">
                  Products
                </Link>
                <Link href="/dashboard/inventory" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">
                  Inventory
                </Link>
                <Link href="/dashboard/stock" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">
                  Stock
                </Link>
                <Link href="/dashboard/customers" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">
                  Customers
                </Link>
                <Link href="/dashboard/sales" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">
                  Sales
                </Link>
                <Link href="/dashboard/expenses" className="rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200">
                  Expenses
                </Link>
                <Link href="/dashboard/billing" className="rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200">
                  Billing
                </Link>
              </nav>
            </div>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent sales</h2>
                <Link
                  href="/dashboard/sales"
                  className="text-sm font-semibold text-emerald-700 underline"
                >
                  View all
                </Link>
              </div>

              {recentSales.length > 0 ? (
                <div className="mt-4 divide-y">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4"
                    >
                      <div>
                        <p className="font-medium">
                          {sale.sale_number ?? "Sale"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">
                          {business.currency}{" "}
                          {Number(sale.total).toLocaleString()}
                        </p>
                        <p className="text-sm capitalize text-slate-500">
                          {sale.payment_status ?? "Unknown"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  No sales recorded yet.
                </p>
              )}
            </section>

            <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-amber-900">
                  Low-stock alerts
                </h2>
                <span className="text-sm font-medium text-amber-800">
                  {lowStockAlerts.length} items
                </span>
              </div>

              {lowStockAlerts.length === 0 ? (
                <p className="mt-2 text-sm text-amber-800">
                  All products have sufficient stock.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {lowStockAlerts.map((item) => {
                    const productName = Array.isArray(item.products)
                      ? item.products[0]?.name
                      : item.products?.name;

                    return (
                      <div
                        key={item.id}
                        className="flex justify-between rounded-lg bg-white p-3"
                      >
                        <span className="font-medium text-gray-900">
                          {productName || "Unnamed product"}
                        </span>
                        <span className="text-sm font-semibold text-amber-700">
                          {item.quantity} left
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <Link
                href="/dashboard/inventory"
                className="mt-4 inline-block text-sm font-semibold text-amber-900 underline"
              >
                View inventory
              </Link>
            </section>
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8">
            <h2 className="text-xl font-semibold">
              No business workspace found
            </h2>
            <p className="mt-2 text-slate-600">
              Register a business to get started.
            </p>
            <Link
              href="/onboarding"
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white"
            >
              Register business
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading your workspace...</p>}>
      <DashboardContent />
    </Suspense>
  );
}
