
"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateBusinessProfile } from "@/app/actions/business";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

type BusinessProfile = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    logo_url: string | null;
};

type BusinessProfileFormState = {
    error?: string;
    success?: string;
};

const initialState: BusinessProfileFormState = {
    error: "",
    success: "",
};

export default function BusinessProfileForm({
    profile,
}: {
    profile: BusinessProfile;
}) {
    const [state, formAction, isPending] = useActionState(
        updateBusinessProfile,
        initialState
    );

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState(profile.logo_url ?? "");
    const [uploadError, setUploadError] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isTransitioning, startTransition] = useTransition();

    useEffect(() => {
        return () => {
            if (previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    function handleLogoChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0] ?? null;
        setUploadError("");

        if (!file) {
            setLogoFile(null);
            setPreviewUrl(profile.logo_url ?? "");
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            setUploadError("Please select a JPG, PNG, or WebP image.");
            event.target.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setUploadError("Your logo must be smaller than 2 MB.");
            event.target.value = "";
            return;
        }

        setLogoFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setUploadError("");

        const formData = new FormData(event.currentTarget);

        if (logoFile) {
            setIsUploading(true);

            try {
                const supabase = createBrowserSupabaseClient();

                const extension = logoFile.name.split(".").pop()?.toLowerCase() || "png";
                const filePath = `${profile.id}/${crypto.randomUUID()}.${extension}`;

                const { error: uploadError } = await supabase.storage
                    .from("business-logos")
                    .upload(filePath, logoFile, {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: logoFile.type,
                    });

                if (uploadError) {
                    throw uploadError;
                }

                const { data } = supabase.storage
                    .from("business-logos")
                    .getPublicUrl(filePath);

                formData.set("logoUrl", data.publicUrl);
            } catch (error) {
                console.error("Logo upload error:", error);
                setUploadError(
                    error instanceof Error
                        ? error.message
                        : "Could not upload your logo. Please try again."
                );
                setIsUploading(false);
                return;
            }

            setIsUploading(false);
        }

        startTransition(() => {
            formAction(formData);
        });
    }

    const busy = isPending || isUploading || isTransitioning;

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
        >
            <div>
                <label className="mb-1 block text-sm font-medium">
                    Business name
                </label>
                <input
                    name="name"
                    type="text"
                    defaultValue={profile.name}
                    required
                    minLength={2}
                    maxLength={100}
                    className="w-full rounded-lg border border-gray-300 p-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Phone number
                </label>
                <input
                    name="phone"
                    type="tel"
                    defaultValue={profile.phone ?? ""}
                    maxLength={30}
                    className="w-full rounded-lg border border-gray-300 p-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Business email
                </label>
                <input
                    name="email"
                    type="email"
                    defaultValue={profile.email ?? ""}
                    className="w-full rounded-lg border border-gray-300 p-3"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Business address
                </label>
                <textarea
                    name="address"
                    defaultValue={profile.address ?? ""}
                    rows={3}
                    maxLength={300}
                    className="w-full rounded-lg border border-gray-300 p-3"
                />
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium">
                    Business logo
                </label>

                {previewUrl && (
                    <div className="mb-3">
                        {/* Blob URLs are created locally for an immediate file preview. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Business logo preview"
                            className="h-28 w-28 rounded-lg border object-contain p-2"
                        />
                    </div>
                )}

                <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    className="block w-full text-sm"
                />

                <p className="mt-1 text-xs text-gray-500">
                    Choose a JPG, PNG, or WebP image. Maximum size: 2 MB.
                </p>
            </div>

            {uploadError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {uploadError}
                </p>
            )}

            {state.error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            {state.success && (
                <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    {state.success}
                </p>
            )}

            <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
                {isUploading
                    ? "Uploading logo..."
                    : busy
                        ? "Saving..."
                        : "Save business details"}
            </button>
        </form>
    );
}
