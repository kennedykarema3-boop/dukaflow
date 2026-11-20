import BusinessProfileForm from "./business-profile-form";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function SettingsContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) redirect("/login");

    const { data: businesses, error } =
        await supabase.rpc("get_my_business");

    if (error || !businesses?.length) {
        return <p className="p-6">Could not load your business profile.</p>;
    } const { data: profiles, error: profileError } =
        await supabase.rpc("get_my_business_profile");

    const profile = profiles?.[0];

   

    if (profileError || !profile) {
        return (
            <div className="p-6">
                <p>Could not load business details.</p>

                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-red-50 p-4 text-sm text-red-700">
                    {JSON.stringify(profileError, Object.getOwnPropertyNames(profileError ?? {}), 2)}
                </pre>
            </div>
        );
    }
    return (
        <main className="mx-auto max-w-3xl p-6">
            <h1 className="text-2xl font-bold">Business settings</h1>
            <p className="mt-1 text-gray-500">
                Manage your business information and receipt details.
            </p>

            <BusinessProfileForm profile={profile} />
        </main>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<p className="p-6">Loading settings...</p>}>
            <SettingsContent />
        </Suspense>
    );
}
