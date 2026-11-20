"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const stockSchema = z.object({
    productId: z.string().uuid(),
    movementType: z.enum(["stock_in", "stock_out", "adjustment"]),
    quantity: z.coerce.number().positive(),
    reference: z.string().trim().max(100),
    notes: z.string().trim().max(500),
});

export async function recordStockMovement(formData: FormData) {
    const parsed = stockSchema.safeParse({
        productId: formData.get("productId"),
        movementType: formData.get("movementType"),
        quantity: formData.get("quantity"),
        reference: formData.get("reference") || "",
        notes: formData.get("notes") || "",
    });

    if (!parsed.success) {
        return { error: "Please check the product, movement type, and quantity." };
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

    const { error } = await supabase.rpc("record_stock_movement", {
        p_business_id: business.business_id,
        p_product_id: parsed.data.productId,
        p_movement_type: parsed.data.movementType,
        p_quantity: parsed.data.quantity,
        p_reference: parsed.data.reference || null,
        p_notes: parsed.data.notes || null,
    });

    if (error) {
        console.error("Stock movement error:", error);
        return {
            error: error.message.includes("Insufficient stock")
                ? "You cannot remove more stock than is available."
                : "Could not record the stock movement. Please try again.",
        };
    }

    redirect("/dashboard/stock");
}