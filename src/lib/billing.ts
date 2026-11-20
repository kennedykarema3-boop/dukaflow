import type { SupabaseClient } from "@supabase/supabase-js";

type LimitResult = { allowed: true } | { allowed: false; error: string };

export async function checkPlanLimit(
    supabase: SupabaseClient,
    businessId: string,
    resource: "products" | "sales"
): Promise<LimitResult> {
    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_code, status, subscription_plans(max_products, max_monthly_sales)")
        .eq("business_id", businessId)
        .in("status", ["trialing", "active", "past_due", "paused"])
        .maybeSingle();

    const planValue = subscription?.subscription_plans;
    const plan = (Array.isArray(planValue) ? planValue[0] : planValue) as {
        max_products: number | null;
        max_monthly_sales: number | null;
    } | null;
    const code = subscription?.plan_code ?? "free";
    const limit = resource === "products" ? plan?.max_products ?? 50 : plan?.max_monthly_sales ?? 100;

    if (limit === null) return { allowed: true };

    if (resource === "products") {
        const { count } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId);
        if ((count ?? 0) >= limit) {
            return { allowed: false, error: `Your ${code} plan allows ${limit} products. Upgrade your plan to add more.` };
        }
    } else {
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        const { count } = await supabase
            .from("sales")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .gte("created_at", monthStart.toISOString());
        if ((count ?? 0) >= limit) {
            return { allowed: false, error: `Your ${code} plan allows ${limit} sales per month. Upgrade your plan to continue.` };
        }
    }

    return { allowed: true };
}
