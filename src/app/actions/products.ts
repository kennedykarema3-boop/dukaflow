"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkPlanLimit } from "@/lib/billing";

const productSchema = z.object({
    name: z.string().trim().min(2).max(150),
    description: z.string().trim().max(1000),
    sku: z.string().trim().max(100),
    price: z.coerce.number().min(0),
    costPrice: z.coerce.number().min(0),
});

export async function createProduct(formData: FormData) {
    const parsed = productSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description") ?? "",
        sku: formData.get("sku") ?? "",
        price: formData.get("price"),
        costPrice: formData.get("costPrice"),
    });

    if (!parsed.success) {
        return {
            error: parsed.error.issues[0]?.message ?? "Invalid product details.",
        };
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

    const planCheck = await checkPlanLimit(supabase, business.business_id, "products");
    if (!planCheck.allowed) return { error: planCheck.error };

    const { error } = await supabase.from("products").insert({
        business_id: business.business_id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        sku: parsed.data.sku || null,
        price: parsed.data.price,
        cost_price: parsed.data.costPrice,
    });

    if (error) {
        console.error("Product creation error:", error.message);

        if (error.code === "23505") {
            return { error: "This SKU is already used by another product." };
        }

        return { error: "Could not save the product. Please try again." };
    }

    redirect("/dashboard/products");
}
