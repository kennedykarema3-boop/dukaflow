
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const businessSchema = z.object({
    name: z.string().trim().min(2, "Business name must have at least 2 characters").max(100),
    countryCode: z.string().length(2, "Select a valid country"),
    currency: z.enum(["KES", "USD", "GBP", "EUR"]),
    businessType: z.enum([
        "retail",
        "wholesale",
        "supermarket",
        "restaurant",
        "other",
    ]),
});

function createSlug(name: string) {
    const cleanName = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return `${cleanName}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createBusiness(formData: FormData) {
    const parsed = businessSchema.safeParse({
        name: formData.get("name"),
        countryCode: formData.get("countryCode"),
        currency: formData.get("currency"),
        businessType: formData.get("businessType"),
    });

    if (!parsed.success) {
        return {
            error: parsed.error.issues[0]?.message ?? "Invalid details.",
        };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            error: "Please log in before registering your business.",
        };
    }

    // Check whether this account already has a business.
    const { data: existingBusinesses, error: lookupError } =
        await supabase.rpc("get_my_business");

    if (lookupError) {
        console.error("Business lookup error:", lookupError.message);
        return {
            error: "Could not verify your business account. Please try again.",
        };
    }

    if (existingBusinesses?.length) {
        redirect(
            `/dashboard?business=${existingBusinesses[0].business_id}`
        );
    }

    // Create a business only if the account has none.
    const { data: businessId, error } = await supabase.rpc(
        "create_business",
        {
            p_name: parsed.data.name,
            p_slug: createSlug(parsed.data.name),
            p_country_code: parsed.data.countryCode,
            p_currency: parsed.data.currency,
            p_business_type: parsed.data.businessType,
        }
    );

    if (error) {
        console.error("Business creation error:", error.message);

        // Another submission may have created the business
        // at the same time. Check again before showing an error.
        const { data: businessesAfterError } =
            await supabase.rpc("get_my_business");

        if (businessesAfterError?.length) {
            redirect(
                `/dashboard?business=${businessesAfterError[0].business_id}`
            );
        }

        if (error.code === "23505") {
            return {
                error: "This account already has a business. Please open your dashboard.",
            };
        }

        return {
            error: "We could not create your business. Please try again.",
        };
    }

    revalidatePath("/dashboard");

    redirect(`/dashboard?business=${businessId}`);
}

const businessProfileSchema = z.object({
    name: z.string().trim().min(2, "Business name must have at least 2 characters").max(100),
    phone: z.string().trim().max(30, "Phone number is too long"),
    email: z.union([
        z.string().trim().email("Enter a valid email address"),
        z.literal(""),
    ]),
    address: z.string().trim().max(300, "Address is too long"),
    logoUrl: z.union([
        z.string().trim().url("Enter a valid logo URL"),
        z.literal(""),
    ]),
});

export async function updateBusinessProfile(
    _prevState: { error?: string; success?: string },
    formData: FormData
) {
    const parsed = businessProfileSchema.safeParse({
        name: formData.get("name"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        address: formData.get("address"),
        logoUrl: formData.get("logoUrl"),
    });

    if (!parsed.success) {
        return {
            error: parsed.error.issues[0]?.message ?? "Invalid details.",
        };
    }

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            error: "Please log in before updating your business.",
        };
    }

    const { error } = await supabase.rpc("update_my_business_profile", {
        p_name: parsed.data.name,
        p_phone: parsed.data.phone,
        p_email: parsed.data.email,
        p_address: parsed.data.address,
        p_logo_url: parsed.data.logoUrl,
    });

    if (error) {
        console.error("Business profile update error:", error.message);
        return {
            error: "Could not update your business profile. Please try again.",
        };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/invoices");

    return {
        success: "Business profile updated successfully.",
    };
}
