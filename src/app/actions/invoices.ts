"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const invoiceSchema = z.object({
    customerId: z.string().uuid().optional().or(z.literal("")),
    invoiceNumber: z.string().trim().min(2).max(50),
    issueDate: z.string().min(1),
    dueDate: z.string().optional(),
    discount: z.coerce.number().min(0),
    items: z.string().min(2),
    notes: z.string().max(1000).optional(),
});

export type InvoiceFormState = {
    error?: string;
};

export async function createInvoice(
    _prevState: InvoiceFormState,
    formData: FormData
): Promise<InvoiceFormState> {
    const parsed = invoiceSchema.safeParse({
        customerId: formData.get("customerId") || "",
        invoiceNumber: formData.get("invoiceNumber"),
        issueDate: formData.get("issueDate"),
        dueDate: formData.get("dueDate") || "",
        discount: formData.get("discount") || "0",
        items: formData.get("items"),
        notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
        return { error: "Please check the invoice details and try again." };
    }

    let items: { product_id: string; quantity: number }[];

    try {
        const rawItems = JSON.parse(parsed.data.items);

        const itemSchema = z.array(
            z.object({
                product_id: z.string().uuid(),
                quantity: z.coerce.number().positive(),
            })
        ).min(1);

        const validatedItems = itemSchema.safeParse(rawItems);

        if (!validatedItems.success) {
            return { error: "Add at least one valid product and quantity." };
        }

        items = validatedItems.data;
    } catch {
        return { error: "Invalid invoice products." };
    }

    if (parsed.data.dueDate && parsed.data.dueDate < parsed.data.issueDate) {
        return { error: "Due date cannot be before the issue date." };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "Please log in again." };
    }

    const { data: businesses, error: businessError } =
        await supabase.rpc("get_my_business");

    const business = businesses?.[0];

    if (businessError || !business) {
        return { error: "No business found for your account." };
    }

    const { data: invoiceId, error } = await supabase.rpc(
        "create_invoice_with_items",
        {
            p_customer_id: parsed.data.customerId || null,
            p_invoice_number: parsed.data.invoiceNumber,
            p_issue_date: parsed.data.issueDate,
            p_due_date: parsed.data.dueDate || null,
            p_discount: parsed.data.discount,
            p_notes: parsed.data.notes || null,
            p_items: items,
        }
    );

    if (error || !invoiceId) {
        console.error("Create invoice error:", error);

        return {
            error: error?.message.includes("duplicate")
                ? "That invoice number already exists. Use a different number."
                : error?.message || "Could not create the invoice.",
        };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/products");

    redirect(`/dashboard/invoices/${invoiceId}`);
}
export async function recordInvoicePayment(formData: FormData) {
    const invoiceId = String(formData.get("invoiceId") || "");
    const amount = Number(formData.get("amount"));

    if (!invoiceId || !Number.isFinite(amount) || amount <= 0) {
        return { error: "Enter a valid payment amount." };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "Please log in again." };
    }

    const { error } = await supabase.rpc("record_invoice_payment", {
        p_invoice_id: invoiceId,
        p_amount: amount,
    });

    if (error) {
        console.error("Invoice payment error:", error);
        return { error: error.message };
    }

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: "Payment recorded successfully." };
}
