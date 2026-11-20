"use client";

export default function PrintButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-black px-5 py-3 text-white print:hidden"
        >
            Print invoice
        </button>
    );
}