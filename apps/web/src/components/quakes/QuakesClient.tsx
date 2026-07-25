"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GEONET } from "@/lib/chains";
import { haversineDistanceKm } from "@/lib/geonet";
import type { GeoNetQuake } from "@/types";

const QuakeMap = dynamic(() => import("./QuakeMap").then((mod) => mod.QuakeMap), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-ink-100 animate-pulse flex items-center justify-center text-ink-400">
      Loading map…
    </div>
  ),
});

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function magnitudeColor(magnitude: number): string {
  if (magnitude >= 6) return "bg-quake-700/10 text-quake-800";
  if (magnitude >= 5) return "bg-quake-100 text-quake-700";
  return "bg-quake-50 text-quake-600";
}

interface MarketCriteriaProps {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  minMagnitude: number;
}

function quakeMatchesMarket(quake: GeoNetQuake, criteria: MarketCriteriaProps): boolean {
  if (quake.magnitude < criteria.minMagnitude) return false;
  if (quake.latitude === undefined || quake.longitude === undefined) return false;
  const distance = haversineDistanceKm(criteria.centerLat, criteria.centerLng, quake.latitude, quake.longitude);
  return distance <= criteria.radiusKm;
}

export function QuakesClient({
  initialQuakes,
  marketCriteria,
}: {
  initialQuakes: GeoNetQuake[];
  marketCriteria?: MarketCriteriaProps;
}) {
  const [quakes, setQuakes] = useState(initialQuakes);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/geonet?mmi=${GEONET.MMI_THRESHOLD}`);
        if (!res.ok) throw new Error("GeoNet request failed");
        const data = await res.json();
        setQuakes(data.quakes ?? []);
        setLastUpdated(new Date());
        setError(null);
      } catch {
        setError("Couldn't refresh live quake data — showing the last known feed.");
      }
    };

    const interval = setInterval(poll, GEONET.POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">Live Earthquake Feed</h1>
          <p className="text-ink-600 mt-1">
            Real-time data from GeoNet · updated {relativeTime(lastUpdated.toISOString())}
          </p>
        </div>
        <Link
          href="/policies/new"
          className="bg-shield-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-shield-700 transition-colors"
        >
          Buy Coverage
        </Link>
      </div>

      {error && (
        <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm">{error}</div>
      )}

      {/* Map */}
      <div className="bg-white rounded-xl shadow-sm border border-ink-100 overflow-hidden mb-8">
        <QuakeMap quakes={quakes} />
      </div>

      {/* Quake List */}
      <div className="bg-white rounded-xl shadow-sm border border-ink-100">
        <div className="p-6 border-b border-ink-100">
          <h2 className="text-xl font-semibold text-ink-900">Recent Quakes</h2>
          <p className="text-sm text-ink-500 mt-1">
            Quakes from the past 365 days
          </p>
        </div>
        <div className="divide-y divide-ink-100">
          {quakes.length === 0 ? (
            <p className="p-8 text-center text-ink-500">No recent quakes above the MMI threshold.</p>
          ) : (
            quakes.map((quake) => {
              const isMatch = marketCriteria ? quakeMatchesMarket(quake, marketCriteria) : false;
              return (
                <div
                  key={quake.publicID}
                  className={`p-4 hover:bg-ink-50 flex items-center gap-4 ${
                    isMatch ? "bg-shield-50 border-l-4 border-shield-500" : ""
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg ${magnitudeColor(quake.magnitude)}`}
                  >
                    {quake.magnitude.toFixed(1)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-ink-900">
                      {quake.locality}
                      {isMatch && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-shield-100 text-shield-700">
                          Matches market criteria
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-ink-500">
                      Depth: {quake.depth.toFixed(1)} km · {relativeTime(quake.time)}
                    </p>
                  </div>
                  <span className="text-xs text-ink-400 uppercase">{quake.quality}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
