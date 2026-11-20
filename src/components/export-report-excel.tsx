
"use client";
import * as XLSX from "xlsx-js-style";

type Sale = {
    id: string;
    sale_number: string;
    customer_id: string | null;
    customer_name: string;
    payment_status: string;
    total: number | string;
    amount_paid: number | string | null;
    created_at: string;
};

type Expense = {
    amount: number | string;
    created_at: string;
};

type Props = {
    rows: {
        label: string;
        value: string | number;
    }[];
    sales: Sale[];
    expenses: Expense[];
    currency: string;
    filename?: string;
};

export default function ExportReportExcel({
    rows,
    sales,
    expenses,
    currency,
    filename = "dukaflow-report.xlsx",
}: Props) {
    function downloadExcel() {
        const workbook = XLSX.utils.book_new();
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "166534" } },
            alignment: { horizontal: "center" },
        };

        const currencyFormat = `"${currency}" #,##0.00`;

        // Sheet 1: Financial Summary
        const summarySheet = XLSX.utils.aoa_to_sheet([
            ["DUKAFLOW BUSINESS REPORT"],
            [],
            ["Report item", "Value"],
            ...rows.map((row) => [row.label, row.value]),
        ]);

        summarySheet["!cols"] = [{ wch: 28 }, { wch: 25 }];

        const salesData = sales.map((sale) => {
            const total = Number(sale.total ?? 0);
            const paid = Number(sale.amount_paid ?? 0);

            return {
                "Sale Number": sale.sale_number,
                Customer: sale.customer_name,
                Date: new Date(sale.created_at).toLocaleDateString(),
                "Payment Status": sale.payment_status,
                "Total Sale": total,
                "Amount Paid": paid,
                Balance: Math.max(0, total - paid),
                Currency: currency,
            };
        });
        const salesSheet = XLSX.utils.json_to_sheet(salesData);

        salesSheet["!cols"] = [
            { wch: 18 },
            { wch: 24 },
            { wch: 16 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 12 },
        ];

        XLSX.utils.book_append_sheet(workbook, summarySheet, "Financial Summary");
        XLSX.utils.book_append_sheet(workbook, salesSheet, "Sales");

        // Sheet 3: Expenses
        const expensesData = expenses.map((expense) => ({
            Date: new Date(expense.created_at).toLocaleDateString(),
            Amount: Number(expense.amount ?? 0),
            Currency: currency,
        }));

        const expensesSheet = XLSX.utils.json_to_sheet(expensesData);

        expensesSheet["!cols"] = [
            { wch: 16 },
            { wch: 18 },
            { wch: 12 },
        ];

        XLSX.utils.book_append_sheet(workbook, expensesSheet, "Expenses");

        // Apply professional formatting to all worksheets
        const sheets = [
            { name: "Financial Summary", sheet: summarySheet },
            { name: "Sales", sheet: salesSheet },
            { name: "Expenses", sheet: expensesSheet },
        ];

        sheets.forEach(({ name, sheet }) => {
            const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");

            // Style column headings
            const headerRow = name === "Financial Summary" ? 2 : 0;

            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({
                    r: headerRow,
                    c: col,
                });

                if (sheet[cellAddress]) {
                    sheet[cellAddress].s = headerStyle;
                }
            }

            // Freeze the heading rows and enable filters
            sheet["!freeze"] = {
                xSplit: 0,
                ySplit: headerRow + 1,
            };

            if (name !== "Financial Summary") {
                sheet["!autofilter"] = {
                    ref: XLSX.utils.encode_range({
                        s: { r: headerRow, c: range.s.c },
                        e: { r: range.e.r, c: range.e.c },
                    }),
                };
            }
        });

        for (let row = 1; row <= salesData.length; row++) {
            ["E", "F", "G"].forEach((col) => {
                const cell = salesSheet[`${col}${row + 1}`];
                if (cell) cell.z = currencyFormat;
            });
        }
        for (let row = 1; row < expensesData.length + 1; row++) {
            const cell = expensesSheet[`B${row + 1}`];
            if (cell) cell.z = currencyFormat;
        }

        // Highlight the net cash flow row in the summary
        const netCashFlowRow = rows.findIndex(
            (row) => row.label === "Net Cash Flow"
        );

        if (netCashFlowRow !== -1) {
            const excelRow = netCashFlowRow + 4;
            const cell = summarySheet[`B${excelRow}`];

            if (cell) {
                cell.s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "DCFCE7" } },
                    numFmt: currencyFormat,
                };
            }
        }
        console.log("Excel worksheets:", workbook.SheetNames);
        XLSX.writeFile(workbook, filename);
    }

    return (
        <button
            type="button"
            onClick={downloadExcel}
            className="rounded-md border border-blue-600 px-4 py-2 text-blue-700 hover:bg-blue-50 print:hidden"
        >
            Download Excel
        </button>
    );
}
