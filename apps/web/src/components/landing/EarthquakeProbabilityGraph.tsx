"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NZ_CITIES, CITY_RADIUS_KM, type NZCity } from "@/lib/cities";

interface TrendPoint {
  time: string;
  probability: number;
  quakeCount: number;
  maxMagnitude: number;
}

export interface CityData {
  city: NZCity;
  currentProbability: number;
  recentQuakeCount: number;
  trend: TrendPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-ink-200 rounded-lg px-4 py-3 shadow-lg">
      <p className="text-ink-500 text-xs mb-1">{label}</p>
      <p className="text-ink-900 text-lg font-bold">{data.probability.toFixed(4)}%</p>
      <div className="flex gap-3 mt-1 text-xs text-ink-500">
        <span>{data.quakeCount} quakes</span>
        {data.maxMagnitude > 0 && <span>Max M{data.maxMagnitude}</span>}
      </div>
    </div>
  );
}

export default function EarthquakeProbabilityGraph({
  selectedCity,
  onCityChange,
}: {
  selectedCity: string;
  onCityChange: (id: string) => void;
}) {
  const [data, setData] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (cityId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/geonet/city?city=${cityId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedCity);
    const interval = setInterval(() => fetchData(selectedCity), 30000);
    return () => clearInterval(interval);
  }, [selectedCity, fetchData]);

  const city = NZ_CITIES.find((c) => c.id === selectedCity);
  const probability = data?.currentProbability ?? 0;

  const trendData = data?.trend ?? [];
  const dataMax = trendData.length > 0 ? Math.max(...trendData.map((p) => p.probability)) : 0.01;
  const yMax = Math.max(dataMax * 1.3, 0.001);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* City Selector */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Seismic Activity Trend</h2>
          <p className="text-ink-500 text-sm mt-1">
            {city?.name ?? "..."} &middot; 30-day probability based on GeoNet data
          </p>
        </div>
      </div>

      {/* Main Probability Display + Chart */}
      <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 pt-8 pb-4 flex items-end gap-6">
          <div>
            <p className="text-ink-500 text-sm font-medium uppercase tracking-wider">
              M5+ Earthquake Probability
            </p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-6xl font-black tabular-nums text-shield-600">
                {loading ? "--" : `${probability.toFixed(4)}`}
              </span>
              <span className="text-2xl font-bold text-ink-400">%</span>
            </div>
          </div>
          <div className="pb-2 flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-ink-900">
                {loading ? "--" : data?.recentQuakeCount ?? 0}
              </p>
              <p className="text-ink-400 text-xs">quakes past 30 days</p>
            </div>
            <div className="w-px bg-ink-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-ink-900">{CITY_RADIUS_KM}</p>
              <p className="text-ink-400 text-xs">km radius</p>
            </div>
            <Link
              href={`/policies/new?city=${selectedCity}`}
              className="ml-2 mb-1 bg-shield-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-shield-700 transition-colors whitespace-nowrap"
            >
              Buy Policy
            </Link>
          </div>
        </div>

        <div className="px-4 pb-4 h-[280px]">
          {error ? (
            <div className="h-full flex items-center justify-center text-ink-400">{error}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#15805c" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#15805c" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9edf3" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#aab8cc"
                  tick={{ fill: "#7c8fab", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, yMax]}
                  stroke="#aab8cc"
                  tick={{ fill: "#7c8fab", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(2)}%`}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="probability"
                  stroke="#15805c"
                  strokeWidth={2.5}
                  fill="url(#probGradient)"
                  dot={false}
                  activeDot={{ r: 6, fill: "#15805c", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="px-8 py-4 bg-ink-50/50 border-t border-ink-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-shield-600" />
              <span className="text-ink-500">Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-quake-500" />
              <span className="text-ink-500">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-ink-500">High</span>
            </div>
          </div>
          <p className="text-ink-400">Data from GeoNet &middot; Updated every 30s</p>
        </div>
      </div>
    </div>
  );
}
