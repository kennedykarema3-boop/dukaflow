import ExportReportExcel from "@/components/export-report-excel";
import ExportReportCSV from "@/components/export-report-csv";
import PrintReportButton from "@/components/print-report-button";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function ReportsContent({
    searchParams,
}: {
    searchParams: Promise<{
        range?: string;
        from?: string;
        to?: string;
    }>;
}) {
    await connection();
    const params = await searchParams;

    const range = ["7", "30", "90", "custom"].includes(params.range ?? "")
        ? params.range!
        : "30";

    const today = new Date();

    const isCustom = range === "custom";

    const parsedFrom = params.from
        ? new Date(`${params.from}T00:00:00`)
        : null;

    const parsedTo = params.to
        ? new Date(`${params.to}T23:59:59.999`)
        : null;

    const customDatesValid =
        !!parsedFrom &&
        !!parsedTo &&
        !Number.isNaN(parsedFrom.getTime()) &&
        !Number.isNaN(parsedTo.getTime()) &&
        parsedFrom <= parsedTo;

    const startDate =
        isCustom && customDatesValid
            ? parsedFrom!
            : new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate() -
                (range === "7" ? 6 : range === "90" ? 89 : 29)
            );

    const endDate =
        isCustom && customDatesValid ? parsedTo! : today;

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: businessRows, error: businessError } =
        await supabase.rpc("get_my_business");

    if (businessError) {
        console.error("Business loading error:", businessError);
    }

    const business = businessRows?.[0];

    if (!business) {
        return <main className="p-8">No business workspace found.</main>;
    }

    // Only owners and managers can view financial reports.
    if (!["owner", "manager"].includes(business.role)) {
        redirect("/dashboard");
    }

    const [{ data: sales, error: salesError }, { data: expenses, error: expensesError }] =
        await Promise.all([
            supabase
                .from("sales")
                .select("id, sale_number, customer_id, payment_status, total, amount_paid, created_at")
                .eq("business_id", business.business_id)
                .gte("created_at", startISO)
                .lte("created_at", endISO),
            supabase
                .from("expenses")
                .select("amount, created_at")
                .eq("business_id", business.business_id)
                .gte("created_at", startISO)
                .lte("created_at", endISO),
        ]);
    const customerIds = [
        ...new Set(
            (sales ?? [])
                .map((sale) => sale.customer_id)
                .filter((id): id is string => Boolean(id))
        ),
    ];

    const { data: customers } = customerIds.length
        ? await supabase
            .from("customers")
            .select("id, full_name")
            .eq("business_id", business.business_id)
            .in("id", customerIds)
        : { data: [] };

    const customerNames = new Map(
        (customers ?? []).map((customer) => [customer.id, customer.full_name])
    );

    const salesForExport = (sales ?? []).map((sale) => ({
        ...sale,
        customer_name: sale.customer_id
            ? customerNames.get(sale.customer_id) ?? "Unknown customer"
            : "Walk-in customer",
    }));
    if (salesError) {
        console.error("Sales report error:", salesError);
    }

    if (expensesError) {
        console.error("Expenses report error:", expensesError);
    }

    const totalSales = (sales ?? []).reduce(
        (sum, sale) => sum + Number(sale.total ?? 0),
        0
    );

    const paymentsCollected = (sales ?? []).reduce(
        (sum, sale) => sum + Number(sale.amount_paid ?? 0),
        0
    );

    const outstandingBalance = (sales ?? []).reduce(
        (sum, sale) =>
            sum + Math.max(
                0,
                Number(sale.total ?? 0) - Number(sale.amount_paid ?? 0)
            ),
        0
    );

    const totalExpenses = (expenses ?? []).reduce(
        (sum, expense) => sum + Number(expense.amount ?? 0),
        0
    ); 
    const currency = business.currency ?? "KES";



    const netCashFlow = paymentsCollected - totalExpenses;
    const reportRows = [
        { label: "Business", value: business.name },
        { label: "Currency", value: currency },
        { label: "Total Sales", value: totalSales.toFixed(2) },
        { label: "Payments Collected", value: paymentsCollected.toFixed(2) },
        { label: "Outstanding Balances", value: outstandingBalance.toFixed(2) },
        { label: "Total Expenses", value: totalExpenses.toFixed(2) },
        { label: "Net Cash Flow", value: netCashFlow.toFixed(2) },
        { label: "Number of Sales", value: (sales ?? []).length },
    ];

   

    const formatMoney = (amount: number) =>
        `${currency} ${amount.toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>{business.name}
                    <p className="font-semibold text-emerald-750"></p>
                    <h1 className="mt-2 text-3xl font-bold">BUSINESS REPORTS</h1>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <PrintReportButton />

                        <ExportReportCSV
                            rows={reportRows}
                            filename={`${business.name}-financial-report.csv`}
                        />
                        
                        <ExportReportExcel
                            rows={reportRows}
                            sales={salesForExport}
                            expenses={expenses ?? []}
                            currency={currency}
                            filename={`${business.name}-financial-report.xlsx`}
                        />
                    </div>
                    <p className="mt-6 text-center text-xs text-gray-500">
                        Powered by DukaFlow
                    </p>
                    <form
                        method="GET"
                        className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border p-4"
                    ></form>
                    <form
                        method="GET"
                        className="print:hidden mb-6 flex flex-wrap items-end gap-4 rounded-lg border p-4"
                    >
                        <div>
                            <label htmlFor="range" className="mb-1 block text-sm font-medium">
                                Date range
                            </label>
                            <select
                                id="range"
                                name="range"
                                defaultValue={range}
                                className="rounded-md border px-3 py-2"
                            >
                                <option value="7">Last 7 days</option>
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                                <option value="custom">Custom dates</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="from" className="mb-1 block text-sm font-medium">
                                From
                            </label>
                            <input
                                id="from"
                                name="from"
                                type="date"
                                defaultValue={params.from ?? ""}
                                className="rounded-md border px-3 py-2"
                            />
                        </div>

                        <div>
                            <label htmlFor="to" className="mb-1 block text-sm font-medium">
                                To
                            </label>
                            <input
                                id="to"
                                name="to"
                                type="date"
                                defaultValue={params.to ?? ""}
                                className="rounded-md border px-3 py-2"
                            />
                        </div>

                        <button
                            type="submit"
                            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                        >
                            Apply filters
                        </button>

                    </form>
                    <p className="mt-2 text-slate-500">{business.name}</p>
                </div>

                <a
                    href="/dashboard"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                    Back to dashboard
                </a>
            </div>

            <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ReportCard title="Total sales" value={formatMoney(totalSales)} />

                <ReportCard
                    title="Payments collected"
                    value={formatMoney(paymentsCollected)}
                    color="text-emerald-700"
                />

                <ReportCard
                    title="Outstanding balances"
                    value={formatMoney(outstandingBalance)}
                    color="text-amber-700"
                />

                <ReportCard
                    title="Total expenses"
                    value={formatMoney(totalExpenses)}
                    color="text-red-600"
                />

                <ReportCard
                    title="Net cash flow"
                    value={formatMoney(netCashFlow)}
                    color={netCashFlow >= 0 ? "text-emerald-700" : "text-red-600"}
                />

                <ReportCard
                    title="Number of sales"
                    value={(sales ?? []).length.toLocaleString()}
                />
            </section>

            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-xl font-semibold">Financial summary</h2>

                <div className="mt-5 space-y-4">
                    <SummaryRow label="Total sales" value={formatMoney(totalSales)} />
                    <SummaryRow
                        label="Payments collected"
                        value={formatMoney(paymentsCollected)}
                    />
                    <SummaryRow
                        label="Outstanding balances"
                        value={formatMoney(outstandingBalance)}
                    />
                    <SummaryRow
                        label="Total expenses"
                        value={formatMoney(totalExpenses)}
                    />

                    <div className="border-t border-slate-200 pt-4">
                        <SummaryRow
                            label="Net cash flow"
                            value={formatMoney(netCashFlow)}
                            bold
                        />
                    </div>
                </div>

                <p className="mt-5 text-xs text-slate-500">
                    These figures cover all available sales and expenses. Net cash flow
                    is payments collected minus recorded expenses; it is not an
                    accounting profit calculation.
                </p>
            </section>
        </main>
    );
}

function ReportCard({
    title,
    value,
    color = "text-slate-900",
}: {
    title: string;
    value: string;
    color?: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{title}</p>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

function SummaryRow({
    label,
    value,
    bold = false,
}: {
    label: string;
    value: string;
    bold?: boolean;
}) {
    return (
        <div className="flex flex-wrap justify-between gap-3">
            <span className={bold ? "font-bold" : "text-slate-600"}>{label}</span>
            <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
        </div>
    );
}

export default function ReportsPage({
    searchParams,
}: {
    searchParams: Promise<{
        range?: string;
        from?: string;
        to?: string;
    }>;
}) {
    return (
        <Suspense fallback={<p className="p-6">Loading reports...</p>}>
            <ReportsContent searchParams={searchParams} />
        </Suspense>
    );
}
