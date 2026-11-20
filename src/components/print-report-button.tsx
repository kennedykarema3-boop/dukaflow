"use client";

export default function PrintReportButton() {
    return (
        <button
            onClick={() => window.print()}
            className="print:hidden rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
            Print / Save as PDF
        </button>
    );
}