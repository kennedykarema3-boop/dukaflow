
"use client";

import { useActionState } from "react";
import { createBusiness } from "@/app/actions/business";

const initialState: { error?: string } = { error: "" };

export default function OnboardingPage() {
    const handleCreateBusiness = async (
        _prevState: typeof initialState,
        formData: FormData
    ) => {
        return createBusiness(formData);
    };

    const [state, formAction, isPending] = useActionState(
        handleCreateBusiness,
        initialState
    );

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow">
                <h1 className="text-2xl font-bold text-gray-900">
                    Register your business
                </h1>

                <p className="mt-2 text-gray-600">
                    Set up your DukaFlow business workspace.
                </p>

                <form action={formAction} className="mt-6 space-y-5">
                    <fieldset disabled={isPending} className="space-y-5">
                        <div>
                            <label className="mb-2 block font-medium">
                                Business name
                            </label>
                            <input
                                name="name"
                                placeholder="e.g. Nairobi General Store"
                                required
                                minLength={2}
                                maxLength={100}
                                className="w-full rounded-lg border p-3"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Country</label>
                            <select
                                name="countryCode"
                                defaultValue="KE"
                                required
                                className="w-full rounded-lg border p-3"
                            >
                                <option value="KE">Kenya</option>
                                <option value="US">United States</option>
                                <option value="GB">United Kingdom</option>
                                <option value="DE">Germany</option>
                                <option value="FR">France</option>
                                <option value="UG">Uganda</option>
                                <option value="TZ">Tanzania</option>
                                <option value="NG">Nigeria</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Currency</label>
                            <select
                                name="currency"
                                defaultValue="KES"
                                required
                                className="w-full rounded-lg border p-3"
                            >
                                <option value="KES">KES — Kenyan Shilling</option>
                                <option value="USD">USD — US Dollar</option>
                                <option value="GBP">GBP — British Pound</option>
                                <option value="EUR">EUR — Euro</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Business type</label>
                            <select
                                name="businessType"
                                defaultValue="retail"
                                required
                                className="w-full rounded-lg border p-3"
                            >
                                <option value="retail">Retail shop</option>
                                <option value="wholesale">Wholesale</option>
                                <option value="supermarket">Supermarket</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </fieldset>

                    {state?.error && (
                        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {state.error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending ? "Creating your business..." : "Create business"}
                    </button>

                    {isPending && (
                        <p className="text-center text-sm text-gray-500">
                            Please wait. Do not refresh this page.
                        </p>
                    )}
                </form>
            </div>
        </main>
    );
}
