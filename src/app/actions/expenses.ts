"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const expenseSchema = z.object({
    category: z.string().trim().min(2).max(80),
    description: z.string().trim().min(2).max(200),
    amount: z.coerce.number().positive(),
    expenseDate: z.string().min(1),
    paymentMethod: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().max(1000).optional(),
});

export type ExpenseFormState = {
    error?: string;
};

export async function createExpense(
    _prevState: ExpenseFormState,
    formData: FormData
): Promise<ExpenseFormState> {
    const parsed = expenseSchema.safeParse({
        category: formData.get("category"),
        description: formData.get("description"),
        amount: formData.get("amount"),
        expenseDate: formData.get("expenseDate"),
        paymentMethod: formData.get("paymentMethod") || undefined,
        reference: formData.get("reference") || undefined,
        notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
        return { error: "Please check the expense details and try again." };
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

    const { error } = await supabase.from("expenses").insert({
        business_id: business.business_id,
        category: parsed.data.category,
        description: parsed.data.description,
        amount: parsed.data.amount,
        expense_date: parsed.data.expenseDate,
        payment_method: parsed.data.paymentMethod || null,
        reference: parsed.data.reference || null,
        notes: parsed.data.notes || null,
        created_by: user.id,
    });

    if (error) {
        console.error("Create expense error:", error);
        return { error: "Could not save the expense. Please try again." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/expenses");

    redirect("/dashboard/expenses");
}