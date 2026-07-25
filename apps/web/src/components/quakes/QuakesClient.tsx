"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { GEONET, getExplorerUrl } from "@/lib/chains";
import { NZ_CITIES } from "@/lib/cities";
import { isChainConfigured } from "@/lib/contracts";
import { useSimulateEarthquake } from "@/lib/hooks/useSimulateEarthquake";
import { haversineDistanceKm, getMagnitudeLabel } from "@quakeshield/shared";
import { SCALE } from "@/types";
import type { GeoNetQuake } from "@/types";

const QuakeMap = dynamic(() => import("./QuakeMap").then((mod) => mod.QuakeMap), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] bg-ink-100 animate-pulse flex items-center justify-center text-ink-400 rounded-2xl">
      Loading map…
    </div>
  ),
});

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function timeCategory(iso: string): "today" | "week" | "older" {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 24) return "today";
  if (hours < 168) return "week";
  return "older";
}

function magBadge(magnitude: number): { bg: string; text: string; ring: string } {
  if (magnitude >= 6) return { bg: "bg-red-500", text: "text-white", ring: "ring-red-500/20" };
  if (magnitude >= 5) return { bg: "bg-quake-600", text: "text-white", ring: "ring-quake-600/20" };
  if (magnitude >= 4) return { bg: "bg-quake-400", text: "text-quake-950", ring: "ring-quake-400/20" };
  if (magnitude >= 3) return { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-100/50" };
  if (magnitude >= 2) return { bg: "bg-ink-100", text: "text-ink-600", ring: "ring-ink-100/50" };
  return { bg: "bg-ink-50", text: "text-ink-400", ring: "ring-ink-50/50" };
}

function depthBar(depth: number): string {
  if (depth < 10) return "bg-shield-400";
  if (depth < 30) return "bg-shield-500";
  if (depth < 70) return "bg-ink-400";
  if (depth < 150) return "bg-ink-500";
  return "bg-ink-600";
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

  const withCoords = quakes.filter((q) => typeof q.latitude === "number" && typeof q.longitude === "number");

  const stats = useMemo(() => {
    if (quakes.length === 0) return null;
    const magnitudes = quakes.map((q) => q.magnitude);
    const depths = quakes.map((q) => q.depth);
    return {
      total: quakes.length,
      maxMag: Math.max(...magnitudes),
      avgDepth: depths.reduce((a, b) => a + b, 0) / depths.length,
    };
  }, [quakes]);

  const grouped = useMemo(() => {
    const groups: Record<string, GeoNetQuake[]> = { today: [], week: [], older: [] };
    for (const q of quakes) {
      groups[timeCategory(q.time)].push(q);
    }
    return groups;
  }, [quakes]);

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-shield-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-shield-500" />
          </div>
          <h1 className="text-3xl font-bold text-ink-900">Live Earthquake Feed</h1>
        </div>
        <p className="text-ink-500">
          Real-time data from GeoNet · refreshed {relativeTime(lastUpdated.toISOString())}
        </p>
      </div>

      <SimulateEarthquakePanel onSimulated={(quake) => setQuakes((prev) => [quake, ...prev])} />

      {error && (
        <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-ink-100 p-4 text-center">
            <div className="text-2xl font-bold text-ink-900">{stats.total.toLocaleString()}</div>
            <div className="text-xs font-medium text-ink-500 mt-1 uppercase tracking-wide">Total Quakes</div>
          </div>
          <div className="bg-white rounded-xl border border-ink-100 p-4 text-center">
            <div className="text-2xl font-bold text-quake-600">M{stats.maxMag.toFixed(1)}</div>
            <div className="text-xs font-medium text-ink-500 mt-1 uppercase tracking-wide">Largest</div>
          </div>
          <div className="bg-white rounded-xl border border-ink-100 p-4 text-center">
            <div className="text-2xl font-bold text-ink-900">{stats.avgDepth.toFixed(0)}<span className="text-sm font-normal text-ink-500"> km</span></div>
            <div className="text-xs font-medium text-ink-500 mt-1 uppercase tracking-wide">Avg Depth</div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="bg-white rounded-2xl shadow-sm border border-ink-100 overflow-hidden mb-8">
        <div className="p-4 border-b border-ink-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wide">Seismic Map</h2>
          <span className="text-xs text-ink-400">{withCoords.length} quakes plotted</span>
        </div>
        <QuakeMap quakes={quakes} />
      </div>

      {/* Quake List */}
      <div className="bg-white rounded-2xl shadow-sm border border-ink-100 overflow-hidden">
        <div className="p-5 border-b border-ink-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">All Earthquakes</h2>
            <p className="text-sm text-ink-500 mt-0.5">Past 365 days · sorted by most recent</p>
          </div>
          <Link
            href="/policies/new"
            className="bg-shield-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-shield-700 transition-colors"
          >
            Buy Coverage
          </Link>
        </div>

        {quakes.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-ink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-ink-700 font-medium">No earthquakes recorded</p>
            <p className="text-sm text-ink-500 mt-1">Quakes will appear here once GeoNet detects them.</p>
          </div>
        ) : (
          <div>
            {/* Today */}
            {grouped.today.length > 0 && (
              <QuakeGroup label="Today" count={grouped.today.length} quakes={grouped.today} marketCriteria={marketCriteria} />
            )}
            {/* This Week */}
            {grouped.week.length > 0 && (
              <QuakeGroup label="This Week" count={grouped.week.length} quakes={grouped.week} marketCriteria={marketCriteria} />
            )}
            {/* Older */}
            {grouped.older.length > 0 && (
              <QuakeGroup label="Older" count={grouped.older.length} quakes={grouped.older} marketCriteria={marketCriteria} />
            )}
          </div>
        )}
      </div>
    </>
  );
}

const DEFAULT_SIM_MAGNITUDE = "7.0";
const DEFAULT_SIM_DEPTH = "10";

/** Demo-only control: records a fake earthquake on-chain via the same
 * `recordEarthquake` entry point the real GeoNet oracle uses, so it triggers
 * real policy payouts for the selected city. Only works if the connected
 * wallet is the deployment's configured oracle — otherwise the tx reverts. */
function SimulateEarthquakePanel({ onSimulated }: { onSimulated: (quake: GeoNetQuake) => void }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfigured = isChainConfigured(chainId);
  const { openConnectModal } = useConnectModal();
  const { simulateEarthquake, step, error, isPending, txHash, reset } = useSimulateEarthquake();

  const [cityId, setCityId] = useState(NZ_CITIES[0].id);
  const [magnitude, setMagnitude] = useState(DEFAULT_SIM_MAGNITUDE);
  const [depth, setDepth] = useState(DEFAULT_SIM_DEPTH);

  const city = NZ_CITIES.find((c) => c.id === cityId) ?? NZ_CITIES[0];
  const magnitudeNum = Number(magnitude) || 0;
  const depthNum = Number(depth) || 0;
  const validation = magnitudeNum <= 0 ? "Magnitude must be greater than 0" : null;
  const canSubmit = isConnected && chainConfigured && !validation && !isPending;

  const handleSimulate = async () => {
    if (!canSubmit) return;
    const publicId = `sim-${city.id}-${Date.now()}`;
    await simulateEarthquake({
      magnitude: SCALE.toMagnitude(magnitudeNum),
      latitude: SCALE.toLatLng(city.lat),
      longitude: SCALE.toLatLng(city.lng),
      depth: BigInt(Math.round(depthNum)),
      publicId,
    })
      .then(() => {
        onSimulated({
          publicID: publicId,
          time: new Date().toISOString(),
          depth: depthNum,
          magnitude: magnitudeNum,
          locality: `${city.name} (simulated)`,
          mmi: Math.min(12, Math.round(magnitudeNum * 1.5)),
          quality: "automatic",
          latitude: city.lat,
          longitude: city.lng,
        });
      })
      .catch(() => {});
  };

  return (
    <div className="bg-amber-50 border border-dashed border-amber-300 rounded-2xl p-5 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Demo: Simulate Earthquake</h2>
      </div>
      <p className="text-sm text-amber-700 mb-4">
        Record a fake quake on-chain for a city to trigger a payout on matching policies — for demo purposes only.
      </p>

      {!chainConfigured ? (
        <p className="text-sm text-amber-700">QuakeShield isn&rsquo;t deployed on this network, so simulation is disabled.</p>
      ) : step === "done" ? (
        <div>
          <p className="text-sm font-medium text-shield-700 mb-1">
            M{magnitudeNum.toFixed(1)} quake recorded near {city.name} — matching policies should now show a payout.
          </p>
          <div className="flex items-center gap-4 mt-2">
            {txHash && (
              <a
                href={`${getExplorerUrl(chainId)}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-shield-600 hover:text-shield-700"
              >
                View transaction →
              </a>
            )}
            <Link href="/policies" className="text-xs font-medium text-shield-600 hover:text-shield-700">
              Check policies →
            </Link>
            <button onClick={reset} type="button" className="text-xs text-ink-400 hover:text-ink-600">
              Simulate another
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">City</label>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
            >
              {NZ_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">Magnitude</label>
            <input
              type="number"
              step="0.1"
              min={0}
              value={magnitude}
              onChange={(e) => setMagnitude(e.target.value)}
              className="w-24 border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1">Depth (km)</label>
            <input
              type="number"
              min={0}
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="w-24 border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isConnected) {
                openConnectModal?.();
                return;
              }
              handleSimulate();
            }}
            disabled={!isConnected ? false : !canSubmit}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {!isConnected ? "Connect Wallet" : isPending ? "Recording…" : "Simulate Earthquake"}
          </button>
        </div>
      )}

      {validation && isConnected && <p className="text-xs text-quake-700 mt-2">{validation}</p>}
      {error && <p className="text-xs text-quake-700 mt-2">{error}</p>}
    </div>
  );
}

function QuakeGroup({
  label,
  count,
  quakes,
  marketCriteria,
}: {
  label: string;
  count: number;
  quakes: GeoNetQuake[];
  marketCriteria?: MarketCriteriaProps;
}) {
  const [expanded, setExpanded] = useState(label === "Today");

  return (
    <div className="border-b border-ink-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-ink-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-700">{label}</span>
          <span className="text-xs bg-ink-100 text-ink-500 px-2 py-0.5 rounded-full font-medium">{count}</span>
        </div>
        <svg
          className={`w-4 h-4 text-ink-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
          <div className="divide-y divide-ink-50 max-h-[600px] overflow-y-auto">
          {quakes.map((quake) => {
            const isMatch = marketCriteria ? quakeMatchesMarket(quake, marketCriteria) : false;
            const badge = magBadge(quake.magnitude);
            return (
              <div
                key={quake.publicID}
                className={`px-5 py-3.5 flex items-center gap-4 hover:bg-ink-50/50 transition-colors ${
                  isMatch ? "bg-shield-50/60 border-l-[3px] border-shield-500" : ""
                }`}
              >
                {/* Magnitude badge */}
                <div className={`w-14 h-14 rounded-xl ${badge.bg} ${badge.text} ring-4 ${badge.ring} flex items-center justify-center font-bold text-base shrink-0`}>
                  {quake.magnitude.toFixed(1)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink-900 truncate">{quake.locality || "Unknown location"}</p>
                    {isMatch && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-shield-100 text-shield-700">
                        Market Match
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-ink-500">{getMagnitudeLabel(quake.magnitude)}</span>
                    <span className="text-ink-300">·</span>
                    <span className="text-xs text-ink-500 flex items-center gap-1">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${depthBar(quake.depth)}`} />
                      {quake.depth.toFixed(1)} km deep
                    </span>
                    <span className="text-ink-300">·</span>
                    <span className="text-xs text-ink-500">MMI {quake.mmi}</span>
                  </div>
                </div>

                {/* Time */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-medium text-ink-600">{relativeTime(quake.time)}</div>
                  <div className={`text-[10px] uppercase font-semibold tracking-wider mt-0.5 ${
                    quake.quality === "best" || quake.quality === "reviewed" ? "text-shield-600" : "text-ink-400"
                  }`}>
                    {quake.quality}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
