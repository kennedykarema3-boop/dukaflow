import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type Callback = {
    Body?: {
        stkCallback?: {
            ResultCode?: number;
            ResultDesc?: string;
            CheckoutRequestID?: string;
            CallbackMetadata?: { Item?: { Name?: string; Value?: string | number }[] };
        };
    };
};

export async function POST(request: Request) {
    const payload = await request.json() as Callback;
    const callback = payload.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    if (callback.ResultCode !== 0) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    const values = new Map((callback.CallbackMetadata?.Item ?? []).map((item) => [item.Name, item.Value]));
    const receipt = String(values.get("MpesaReceiptNumber") ?? callback.CheckoutRequestID);
    const amount = Number(values.get("Amount") ?? 0);
    const phone = String(values.get("PhoneNumber") ?? "");
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // CheckoutRequestID is the idempotency key for this STK request.
    const { data: existing } = await supabase.from("payment_transactions").select("id").eq("provider_reference", callback.CheckoutRequestID).maybeSingle();
    if (existing) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    const { data: checkout } = await supabase.from("mpesa_checkouts").select("business_id, plan_code, amount").eq("checkout_request_id", callback.CheckoutRequestID).maybeSingle();
    if (!checkout) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    const { data: subscription } = await supabase.from("subscriptions").select("id").eq("business_id", checkout.business_id).in("status", ["trialing", "active", "past_due", "paused"]).maybeSingle();
    await supabase.from("payment_transactions").insert({
        business_id: checkout.business_id,
        subscription_id: subscription?.id ?? null,
        provider: "mpesa",
        provider_reference: callback.CheckoutRequestID,
        amount,
        currency: "KES",
        status: "success",
        raw_event: { payload, receipt, phone },
    });
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const update = {
        plan_code: checkout.plan_code,
        billing_interval: "monthly",
        status: "active",
        provider: "mpesa",
        provider_subscription_id: receipt,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
    };
    if (subscription) await supabase.from("subscriptions").update(update).eq("id", subscription.id);
    else await supabase.from("subscriptions").insert({ business_id: checkout.business_id, ...update });
    await supabase.from("mpesa_checkouts").update({ status: "success", completed_at: now.toISOString() }).eq("checkout_request_id", callback.CheckoutRequestID);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
