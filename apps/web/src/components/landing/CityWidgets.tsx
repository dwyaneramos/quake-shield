"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import { NZ_CITIES, type NZCity } from "@/lib/cities";

interface WidgetData {
  city: NZCity;
  currentProbability: number;
  recentQuakeCount: number;
  trend: { probability: number }[];
}

export default function CityWidgets({
  selectedCity,
  onSelect,
}: {
  selectedCity: string;
  onSelect: (id: string) => void;
}) {
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      const res = await fetch("/api/geonet/cities");
      if (!res.ok) throw new Error();
      const { cities } = await res.json();
      if (!cancelled) {
        setWidgets(cities);
        setLoading(false);
      }
    }
    loadAll();
    const interval = setInterval(loadAll, 120_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto mt-6">
      <p className="text-ink-500 text-xs font-medium uppercase tracking-wider mb-3">
        Other Cities
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {NZ_CITIES.filter((c) => c.id !== selectedCity).map((city) => {
          const w = widgets.find((x) => x.city.id === city.id);
          const prob = w?.currentProbability ?? 0;
          const isActive = city.id === selectedCity;

          return (
            <div
              key={city.id}
              className={`rounded-xl border p-3 transition-all ${
                isActive
                  ? "border-shield-400 bg-shield-50 shadow-sm"
                  : "border-ink-200 bg-white hover:border-ink-300 hover:shadow-sm"
              }`}
            >
              <button
                onClick={() => onSelect(city.id)}
                className="text-left w-full"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-ink-800 truncate">
                    {city.name}
                  </span>
                  {loading ? (
                    <div className="h-4 w-12 bg-ink-100 rounded animate-pulse" />
                  ) : (
                    <span className="text-xs text-ink-400 tabular-nums">
                      {w ? `${prob.toFixed(2)}%` : "--"}
                    </span>
                  )}
                </div>
                <div className="h-8 pointer-events-none">
                  {loading ? (
                    <div className="h-full flex items-center">
                      <div className="w-full flex gap-1 items-end">
                        {[0.3, 0.6, 0.4, 0.8, 0.5].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-ink-100 rounded animate-pulse"
                            style={{ height: `${h * 100}%`, animationDelay: `${i * 100}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : w && w.trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={w.trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`spark-${city.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#15805c" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#15805c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="probability"
                          stroke="#15805c"
                          strokeWidth={1.5}
                          fill={`url(#spark-${city.id})`}
                          dot={false}
                          activeDot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-full h-px bg-ink-100" />
                    </div>
                  )}
                </div>
                <div className="mt-1 text-xs text-ink-400">
                  {loading ? (
                    <div className="h-3 w-28 bg-ink-100 rounded animate-pulse" />
                  ) : (
                    w ? `${w.recentQuakeCount} quakes past 30d` : "No data"
                  )}
                </div>
              </button>
              <Link
                href={`/policies/new?city=${city.id}`}
                className="mt-2 block w-full text-center text-xs font-semibold text-white bg-shield-600 hover:bg-shield-700 rounded-lg py-1.5 transition-colors"
              >
                Buy Policy
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
