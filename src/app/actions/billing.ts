"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const allowedPlans = new Set(["free", "starter", "business", "enterprise"]);

export async function changeSubscriptionPlan(formData: FormData) {
    const planCode = String(formData.get("planCode") ?? "");
    if (!allowedPlans.has(planCode)) return;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: businesses, error: businessError } = await supabase.rpc("get_my_business");
    const business = businesses?.[0];
    if (businessError || !business || !["owner", "admin"].includes(business.role)) {
        return;
    }

    const { data: existing, error: lookupError } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("business_id", business.business_id)
        .in("status", ["trialing", "active", "past_due", "paused"])
        .maybeSingle();

    if (lookupError) return;

    const update = existing
        ? supabase.from("subscriptions").update({
            plan_code: planCode,
            status: planCode === "free" ? "active" : "trialing",
            provider: null,
            updated_at: new Date().toISOString(),
        }).eq("id", existing.id)
        : supabase.from("subscriptions").insert({
            business_id: business.business_id,
            plan_code: planCode,
            status: planCode === "free" ? "active" : "trialing",
        });

    const { error } = await update;
    if (error) {
        console.error("Subscription update error:", error.message);
        return;
    }

    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");
}
