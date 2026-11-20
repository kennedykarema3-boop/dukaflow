"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const prices: Record<string, number> = { starter: 1500, business: 4000 };

export async function startPaystackCheckout(formData: FormData) {
    const planCode = String(formData.get("planCode") ?? "");
    const amount = prices[planCode];
    if (!amount) return;

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured.");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) redirect("/login");

    const { data: businesses } = await supabase.rpc("get_my_business");
    const business = businesses?.[0];
    if (!business || !["owner", "admin"].includes(business.role)) return;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: user.email,
            amount: Math.round(amount * 100),
            currency: "KES",
            callback_url: `${appUrl}/dashboard/billing?payment=processing`,
            metadata: {
                business_id: business.business_id,
                plan_code: planCode,
                billing_interval: "monthly",
            },
        }),
    });

    const result = await response.json() as {
        status?: boolean;
        message?: string;
        data?: { authorization_url: string };
    };

    if (!response.ok || !result.status || !result.data?.authorization_url) {
        console.error("Paystack initialization failed:", result.message);
        throw new Error("Could not start payment. Please try again.");
    }

    redirect(result.data.authorization_url);
}
