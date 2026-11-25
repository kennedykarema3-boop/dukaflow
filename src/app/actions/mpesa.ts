"use server";

import { createClient } from "@/lib/supabase/server";

const prices: Record<string, number> = { starter: 1500, business: 4000 };

function timestamp() {
    return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

export async function startMpesaCheckout(formData: FormData) {
    const planCode = String(formData.get("planCode") ?? "");
    const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
    const amount = prices[planCode];
    if (!amount || !/^2547\d{8}$/.test(phone)) return;

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
        throw new Error("M-Pesa server variables are not configured.");
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: businesses } = await supabase.rpc("get_my_business");
    const business = businesses?.[0];
    if (!business || !["owner", "admin"].includes(business.role)) return;

    const baseUrl = process.env.MPESA_ENVIRONMENT === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` },
    });
    const token = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) throw new Error("Could not authenticate with M-Pesa.");

    const time = timestamp();
    const password = Buffer.from(`${shortcode}${passkey}${time}`).toString("base64");
    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: time,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: shortcode,
            PhoneNumber: phone,
            CallBackURL: callbackUrl,
            AccountReference: `DUKAFLOW-${business.business_id.slice(0, 8)}`,
            TransactionDesc: `${planCode} monthly subscription`,
        }),
    });
    const result = await response.json() as { ResponseCode?: string; ResponseDescription?: string; CheckoutRequestID?: string };
    if (!response.ok || result.ResponseCode !== "0" || !result.CheckoutRequestID) {
        console.error("M-Pesa STK push failed:", result);
        throw new Error(result.ResponseDescription ?? "Could not start M-Pesa payment.");
    }

    await supabase.from("mpesa_checkouts").insert({
        checkout_request_id: result.CheckoutRequestID,
        business_id: business.business_id,
        plan_code: planCode,
        phone,
        amount,
    });
}
