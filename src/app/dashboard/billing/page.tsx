import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { changeSubscriptionPlan } from "@/app/actions/billing";
import { startMpesaCheckout } from "@/app/actions/mpesa";

const plans = [
    { code: "free", name: "Free", price: "KES 0/month", detail: "50 products and 100 sales per month" },
    { code: "starter", name: "Starter", price: "KES 1,500/month", detail: "500 products and unlimited sales" },
    { code: "business", name: "Business", price: "KES 4,000/month", detail: "Unlimited products, sales and advanced reports" },
];

async function BillingContent() {
    await connection();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: businesses } = await supabase.rpc("get_my_business");
    const business = businesses?.[0];
    if (!business) return <main className="p-6">No business workspace found.</main>;

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_code, status, billing_interval, current_period_end, subscription_plans(name, monthly_price)")
        .eq("business_id", business.business_id)
        .in("status", ["trialing", "active", "past_due", "paused"])
        .maybeSingle();

    const currentPlan = subscription?.plan_code ?? "free";
    const canManage = ["owner", "admin"].includes(business.role);
    const [{ count: productCount }, { count: salesCount }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", business.business_id),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("business_id", business.business_id).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    return (
        <main className="mx-auto max-w-5xl p-6 sm:p-10">
            <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Back to dashboard</Link>
            <div className="mt-6">
                <h1 className="text-3xl font-bold">Billing and plan</h1>
                <p className="mt-2 text-slate-600">Manage the plan for {business.name}.</p>
            </div>

            <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="text-sm font-medium text-emerald-800">Current plan</p>
                <h2 className="mt-1 text-2xl font-bold capitalize text-emerald-950">{currentPlan}</h2>
                <p className="mt-2 text-sm text-emerald-800">Status: {subscription?.status ?? "active"}. Payment collection will be connected before paid plans are charged.</p>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Products used</p><p className="mt-1 text-2xl font-bold">{productCount ?? 0}</p></div>
                <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Sales this month</p><p className="mt-1 text-2xl font-bold">{salesCount ?? 0}</p></div>
            </section>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
                {plans.map((plan) => (
                    <form key={plan.code} action={changeSubscriptionPlan} className={`rounded-xl border bg-white p-6 ${currentPlan === plan.code ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200"}`}>
                        <input type="hidden" name="planCode" value={plan.code} />
                        <h2 className="text-xl font-bold">{plan.name}</h2>
                        <p className="mt-3 font-semibold text-emerald-700">{plan.price}</p>
                        <p className="mt-3 min-h-12 text-sm text-slate-600">{plan.detail}</p>
                        {plan.code === "free" ? (
                            <button disabled={!canManage || currentPlan === plan.code} className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                                {currentPlan === plan.code ? "Current plan" : canManage ? "Choose Free" : "Admin only"}
                            </button>
                        ) : (
                            <>
                                <input name="phone" required pattern="2547[0-9]{8}" placeholder="254712345678" className="mt-6 w-full rounded-lg border px-3 py-2 text-sm" aria-label="M-Pesa phone number" />
                                <button formAction={startMpesaCheckout} disabled={!canManage || currentPlan === plan.code} className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                                    {currentPlan === plan.code ? "Current plan" : canManage ? "Pay with M-Pesa" : "Admin only"}
                                </button>
                            </>
                        )}
                    </form>
                ))}
            </div>
            {!canManage && <p className="mt-6 text-sm text-amber-700">Only the business owner or admin can change the subscription.</p>}
            <p className="mt-8 text-sm text-slate-500">M-Pesa subscriptions require a payment confirmation each billing period. Automatic recurring M-Pesa debits are not used.</p>
        </main>
    );
}

export default function BillingPage() {
    return <Suspense fallback={<p className="p-6">Loading billing...</p>}><BillingContent /></Suspense>;
}
