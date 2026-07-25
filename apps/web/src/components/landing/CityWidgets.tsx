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
      setLoading(true);
      const results = await Promise.allSettled(
        NZ_CITIES.map(async (city) => {
          const res = await fetch(`/api/geonet/city?city=${city.id}`);
          if (!res.ok) throw new Error();
          return res.json() as Promise<WidgetData>;
        })
      );
      if (!cancelled) {
        setWidgets(results.filter((r) => r.status === "fulfilled").map((r) => r.value));
        setLoading(false);
      }
    }
    loadAll();
    const interval = setInterval(loadAll, 60000);
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
                  <span className="text-xs text-ink-400 tabular-nums">
                    {w ? `${prob.toFixed(2)}%` : "--"}
                  </span>
                </div>
                <div className="h-8 pointer-events-none">
                  {w && w.trend.length > 0 ? (
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
                  {w ? `${w.recentQuakeCount} quakes` : "Loading..."}
                </div>
              </button>
              <Link
                href={`/policies/new?city=${city.id}`}
                className="mt-2 block w-full text-center text-xs font-medium text-shield-700 bg-shield-50 hover:bg-shield-100 border border-shield-200 rounded-lg py-1.5 transition-colors"
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
