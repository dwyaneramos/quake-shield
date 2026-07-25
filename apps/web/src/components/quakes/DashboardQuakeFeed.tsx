"use client";

import { useEffect, useState } from "react";
import { GEONET } from "@/lib/chains";
import type { GeoNetQuake } from "@/types";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function magnitudeBadge(m: number): string {
  if (m >= 6) return "bg-quake-700/10 text-quake-800";
  if (m >= 5) return "bg-quake-100 text-quake-700";
  if (m >= 4) return "bg-quake-50 text-quake-600";
  return "bg-ink-100 text-ink-500";
}

export default function DashboardQuakeFeed({ threshold }: { threshold: number }) {
  const [quakes, setQuakes] = useState<GeoNetQuake[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/geonet?mmi=${GEONET.MMI_THRESHOLD}`);
        if (!res.ok) return;
        const data = await res.json();
        setQuakes(data.quakes ?? []);
        setLastUpdated(new Date());
      } catch {}
    };

    poll();
    const interval = setInterval(poll, GEONET.POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const filtered = quakes.filter((q) => q.magnitude >= threshold);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-ink-100">
      <div className="p-6 border-b border-ink-100">
        <h2 className="text-xl font-semibold text-ink-900">Live Earthquake Feed</h2>
        <p className="text-sm text-ink-500 mt-1">
          {filtered.length} quakes shown · updated {relativeTime(lastUpdated.toISOString())}
        </p>
      </div>

      <div className="divide-y divide-ink-100 max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-ink-500">
            No quakes at or above M{threshold.toFixed(1)}.
          </p>
        ) : (
          filtered.slice(0, 50).map((quake) => (
            <div key={quake.publicID} className="p-4 hover:bg-ink-50 flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm ${magnitudeBadge(quake.magnitude)}`}
              >
                {quake.magnitude.toFixed(1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink-900 truncate">{quake.locality}</p>
                <p className="text-sm text-ink-500">
                  Depth {quake.depth.toFixed(1)} km · {relativeTime(quake.time)}
                </p>
              </div>
              <span className="text-xs text-ink-400 uppercase flex-shrink-0">{quake.quality}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
