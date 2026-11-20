
"use client";

import { useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

type ExpensesChartProps = {
    data: {
        day: string;
        total: number;
    }[];
    currency: string;
};

export default function ExpensesChart({
    data,
    currency,
}: ExpensesChartProps) {
    const [range, setRange] = useState<7 | 30 | 90>(7);

    const filteredData = data.slice(-range);
    const ranges: (7 | 30 | 90)[] = [7, 30, 90];

    return (
        <div className="w-full">
            <div className="mb-5 flex flex-wrap gap-2">
                {ranges.map((days) => (
                    <button
                        key={days}
                        type="button"
                        onClick={() => setRange(days)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${range === days
                                ? "bg-red-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                    >
                        {days} days
                    </button>
                ))}
            </div>

            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="day"
                            interval={range === 90 ? 9 : range === 30 ? 2 : 0}
                        />
                        <YAxis />
                        <Tooltip
                            formatter={(value) => [
                                `${currency} ${Number(value).toLocaleString()}`,
                                "Expenses",
                            ]}
                        />
                        <Bar
                            dataKey="total"
                            fill="#dc2626"
                            radius={[6, 6, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
