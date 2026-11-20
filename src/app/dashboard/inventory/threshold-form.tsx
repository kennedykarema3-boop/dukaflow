"use client";

import { useActionState } from "react";
import { updateLowStockThreshold } from "@/app/actions/inventory";

type ActionState = {
    error: string;
    success: string;
};

const initialState: ActionState = {
    error: "",
    success: "",
};

type Props = {
    productId: string;
    threshold: number;
};

export default function ThresholdForm({ productId, threshold }: Props) {
    const [state, formAction, isPending] = useActionState(
        async (_previousState: ActionState, formData: FormData): Promise<ActionState> => {
            const result = await updateLowStockThreshold(formData);
            return {
                error: result?.error ?? "",
                success: result?.success ?? "",
            };
        },
        initialState
    );

    return (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="productId" value={productId} />

            <input
                type="number"
                name="threshold"
                min="0"
                max="1000000"
                step="0.01"
                defaultValue={threshold}
                required
                className="w-24 rounded-lg border p-2"
            />

            <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
            >
                {isPending ? "Saving..." : "Update"}
            </button>

            {state.error && (
                <p className="w-full text-sm text-red-600">{state.error}</p>
            )}

            {state.success && (
                <p className="w-full text-sm text-green-600">{state.success}</p>
            )}
        </form>
    );
}