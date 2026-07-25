"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  time: string;
  quakeCount: number;
  maxMagnitude: number;
}

export function RegionActivityChart({ trend }: { trend: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2810c" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#f2810c" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e9edf3" vertical={false} />
        <XAxis dataKey="time" stroke="#aab8cc" tick={{ fill: "#7c8fab", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis stroke="#aab8cc" tick={{ fill: "#7c8fab", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
        <Tooltip
          contentStyle={{ backgroundColor: "#fff", border: "1px solid #d1dae5", borderRadius: "8px", fontSize: "12px" }}
          formatter={(value) => [value, "Quakes"]}
        />
        <Area type="monotone" dataKey="quakeCount" stroke="#f2810c" strokeWidth={2} fill="url(#riskGrad)" dot={false} activeDot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
