"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const thresholdSchema = z.object({
    productId: z.string().uuid(),
    threshold: z.coerce.number().min(0).max(1000000),
});

export async function updateLowStockThreshold(formData: FormData) {
    const parsed = thresholdSchema.safeParse({
        productId: formData.get("productId"),
        threshold: formData.get("threshold"),
    });

    if (!parsed.success) {
        return { error: "Please enter a valid stock threshold." };
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
        return { error: "Could not find your business." };
    }

    const business = businessRows[0];

    const { error } = await supabase
        .from("inventory")
        .update({
            low_stock_threshold: parsed.data.threshold,
            updated_at: new Date().toISOString(),
        })
        .eq("business_id", business.business_id)
        .eq("product_id", parsed.data.productId);

    if (error) {
        console.error("Threshold update error:", error);
        return { error: "Could not update the stock threshold." };
    }

    revalidatePath("/dashboard/inventory");

    return { success: "Stock threshold updated successfully." };
}