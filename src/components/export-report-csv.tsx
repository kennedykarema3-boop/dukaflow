"use client";

type Props = {
    rows: {
        label: string;
        value: string | number;
    }[];
    filename?: string;
};

export default function ExportReportCSV({
    rows,
    filename = "dukaflow-report.csv",
}: Props) {
    function downloadCSV() {
        const escapeCSV = (value: string | number) =>
            `"${String(value).replace(/"/g, '""')}"`;

        const csv = [
            ["Report item", "Value"],
            ...rows.map((row) => [row.label, row.value]),
        ]
            .map((row) => row.map(escapeCSV).join(","))
            .join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }

    return (
        <button
            type="button"
            onClick={downloadCSV}
            className="rounded-md border border-emerald-600 px-4 py-2 text-emerald-700 hover:bg-emerald-50 print:hidden"
        >
            Download CSV
        </button>
    );
}