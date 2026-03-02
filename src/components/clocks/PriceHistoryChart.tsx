"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface PriceHistoryChartProps {
  data: { date: string; price: number }[];
  currency: string;
}

const formatPrice = (value: number, currency: string) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);

export default function PriceHistoryChart({ data, currency }: PriceHistoryChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatPrice(Number(value), currency)}
            width={90}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #1f2937",
              borderRadius: 12
            }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(value: number) => formatPrice(value, currency)}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#34d399"
            strokeWidth={3}
            dot={{ r: 4, fill: "#34d399" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
