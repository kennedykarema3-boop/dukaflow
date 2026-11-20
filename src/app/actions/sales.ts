
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkPlanLimit } from "@/lib/billing";

const saleSchema = z.object({
    customerId: z.string().uuid().optional().or(z.literal("")),
    items: z.string().min(2),
    discount: z.coerce.number().min(0),
    paymentStatus: z.enum(["paid", "partial", "unpaid"]),
    notes: z.string().max(1000),
    amountPaid: z.coerce.number().min(0),
});

export async function createSale(formData: FormData) {
    const parsed = saleSchema.safeParse({
        customerId: formData.get("customerId") || "",
        items: formData.get("items"),
        discount: formData.get("discount") || "0",
        paymentStatus: formData.get("paymentStatus"),
        notes: formData.get("notes") || "",
        amountPaid: formData.get("amountPaid") || "0",
    });

    if (!parsed.success) {
        return { error: "Please check the sale details and try again." };
    }

    let items: { product_id: string; quantity: number }[];

    try {
        const rawItems = JSON.parse(parsed.data.items);

        const itemsSchema = z.array(
            z.object({
                product_id: z.string().uuid(),
                quantity: z.coerce.number().positive(),
            })
        ).min(1);

        items = itemsSchema.parse(rawItems);
    } catch {
        return { error: "Please add at least one valid product." };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "Please log in first." };
    }

    const { data: businessRows, error: businessError } =
        await supabase.rpc("get_my_business");

    if (businessError || !businessRows?.length) {
        return { error: "Could not find your business workspace." };
    }

    const business = businessRows[0];

    const planCheck = await checkPlanLimit(supabase, business.business_id, "sales");
    if (!planCheck.allowed) return { error: planCheck.error };

    const { data: saleId, error } = await supabase.rpc("create_sale", {
        p_business_id: business.business_id,
        p_customer_id: parsed.data.customerId || null,
        p_items: items,
        p_discount: parsed.data.discount,
        p_payment_status: parsed.data.paymentStatus,
        p_notes: parsed.data.notes || null,
        p_amount_paid: parsed.data.amountPaid,
    });

    if (error) {
        console.error("Sale creation error:", error);
        return {
            error: error.message.includes("Insufficient stock")
                ? error.message
                : "Could not record the sale. Please check the details and try again.",
        };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/stock");
    revalidatePath("/dashboard/sales");

    redirect(`/dashboard/sales/${saleId}`);
}

const salePaymentSchema = z.object({
    saleId: z.string().uuid(),
    amount: z.coerce.number().positive(),
    notes: z.string().max(1000),
});

export async function recordSalePayment(formData: FormData) {
    const parsed = salePaymentSchema.safeParse({
        saleId: formData.get("saleId"),
        amount: formData.get("amount"),
        notes: formData.get("notes") || "",
    });

    if (!parsed.success) {
        return { error: "Please enter a valid payment amount." };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "Please log in first." };
    }

    const { data: businessRows, error: businessError } =
        await supabase.rpc("get_my_business");

    if (businessError || !businessRows?.length) {
        return { error: "Could not find your business workspace." };
    }

    const business = businessRows[0];

    const { error } = await supabase.rpc("record_sale_payment", {
        p_business_id: business.business_id,
        p_sale_id: parsed.data.saleId,
        p_amount: parsed.data.amount,
        p_notes: parsed.data.notes || null,
    });

    if (error) {
        console.error("Sale payment error:", error);

        return {
            error: error.message.includes("outstanding balance")
                ? error.message
                : "Could not record the payment. Please try again.",
        };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/sales");
    revalidatePath(`/dashboard/sales/${parsed.data.saleId}`);

    return { success: true };
}
