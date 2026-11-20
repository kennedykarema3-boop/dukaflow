import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });

    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") ?? "";
    const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
        event?: string;
        data?: {
            reference?: string;
            amount?: number;
            currency?: string;
            status?: string;
            subscription_code?: string;
            metadata?: { business_id?: string; plan_code?: string; billing_interval?: string };
        };
    };

    if (event.event !== "charge.success" || !event.data?.reference) {
        return NextResponse.json({ received: true });
    }

    const metadata = event.data.metadata;
    if (!metadata?.business_id || !metadata.plan_code) {
        return NextResponse.json({ error: "Missing payment metadata" }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("provider_reference", event.data.reference)
        .maybeSingle();
    if (existing) return NextResponse.json({ received: true });

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("business_id", metadata.business_id)
        .in("status", ["trialing", "active", "past_due", "paused"])
        .maybeSingle();

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: transactionError } = await supabase.from("payment_transactions").insert({
        business_id: metadata.business_id,
        subscription_id: subscription?.id ?? null,
        provider: "paystack",
        provider_reference: event.data.reference,
        amount: Number(event.data.amount ?? 0) / 100,
        currency: event.data.currency ?? "KES",
        status: "success",
        raw_event: event,
    });
    if (transactionError && transactionError.code !== "23505") {
        return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
    }

    const update = {
        plan_code: metadata.plan_code,
        billing_interval: metadata.billing_interval ?? "monthly",
        status: "active",
        provider: "card",
        provider_subscription_id: event.data.subscription_code ?? null,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
    };
    const query = subscription
        ? supabase.from("subscriptions").update(update).eq("id", subscription.id)
        : supabase.from("subscriptions").insert({ business_id: metadata.business_id, ...update });
    await query;

    return NextResponse.json({ received: true });
}
