"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const customerSchema = z.object({
    fullName: z.string().trim().min(2).max(150),
    phone: z.string().trim().max(30),
    email: z.string().trim().max(254),
    address: z.string().trim().max(500),
    notes: z.string().trim().max(1000),
});

export async function createCustomer(formData: FormData) {
    const parsed = customerSchema.safeParse({
        fullName: formData.get("fullName"),
        phone: formData.get("phone") || "",
        email: formData.get("email") || "",
        address: formData.get("address") || "",
        notes: formData.get("notes") || "",
    });

    if (!parsed.success) {
        return { error: "Please enter a valid customer name and details." };
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

    const { error } = await supabase.from("customers").insert({
        business_id: business.business_id,
        full_name: parsed.data.fullName,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
    });

    if (error) {
        console.error("Customer creation error:", error);
        return { error: "Could not save the customer. Please try again." };
    }

    redirect("/dashboard/customers");
}