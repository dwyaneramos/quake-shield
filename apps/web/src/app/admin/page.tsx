"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { useSimulateEarthquake } from "@/lib/hooks/useSimulateEarthquake";
import { usePoolStats } from "@/lib/hooks/useQuakeShield";
import { isChainConfigured, getContracts } from "@/lib/contracts";
import { NZ_CITIES, CITY_RADIUS_KM } from "@/lib/cities";
import { SCALE } from "@/types";
import { getExplorerUrl } from "@/lib/chains";
import type L from "leaflet";

const AdminSimMap = dynamic(
  () =>
    import("@/components/admin/AdminSimMap").then((mod) => mod.AdminSimMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] bg-ink-100 animate-pulse rounded-xl flex items-center justify-center text-ink-400">
        Loading map...
      </div>
    ),
  }
);

const MAGNITUDE_PRESETS = [
  { label: "M5.0", value: 5.0 },
  { label: "M5.5", value: 5.5 },
  { label: "M6.0", value: 6.0 },
  { label: "M6.5", value: 6.5 },
  { label: "M7.0", value: 7.0 },
];

const RADIUS_PRESETS = [
  { label: "50km", value: 50 },
  { label: "100km", value: 100 },
  { label: "150km", value: 150 },
  { label: "200km", value: 200 },
  { label: "300km", value: 300 },
];

interface SimulationResult {
  id: string;
  magnitude: number;
  lat: number;
  lng: number;
  depth: number;
  radiusKm: number;
  city: string;
  txHash: string;
  timestamp: Date;
}

export default function AdminPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfigured = isChainConfigured(chainId);
  const { openConnectModal } = useConnectModal();

  const { stats, isLoading: statsLoading } = usePoolStats();
  const {
    simulateEarthquake,
    step,
    error,
    isPending,
    txHash,
    reset,
  } = useSimulateEarthquake();

  const mapRef = useRef<L.Map>(null);

  const [epicenter, setEpicenter] = useState<[number, number]>([-41.2865, 174.7762]);
  const [latitude, setLatitude] = useState("-41.2865");
  const [longitude, setLongitude] = useState("174.7762");
  const [magnitude, setMagnitude] = useState("6.0");
  const [depth, setDepth] = useState("10");
  const [radiusKm, setRadiusKm] = useState(150);
  const [history, setHistory] = useState<SimulationResult[]>([]);

  const mag = parseFloat(magnitude) || 0;
  const depthNum = parseFloat(depth) || 10;

  const reserveRatio =
    stats && stats.totalActiveCoverage > 0n
      ? Number((stats.balance * 10000n) / stats.totalActiveCoverage) / 100
      : null;

  const handleMapClick = useCallback((lat: number, lng: number) => {
    const clampedLat = Math.max(-47.5, Math.min(-34, lat));
    const clampedLng = Math.max(165, Math.min(179, lng));
    setEpicenter([clampedLat, clampedLng]);
    setLatitude(clampedLat.toFixed(4));
    setLongitude(clampedLng.toFixed(4));
  }, []);

  const handleCitySelect = useCallback((cityId: string) => {
    const city = NZ_CITIES.find((c) => c.id === cityId);
    if (!city) return;
    setEpicenter([city.lat, city.lng]);
    setLatitude(city.lat.toFixed(4));
    setLongitude(city.lng.toFixed(4));
    mapRef.current?.flyTo([city.lat, city.lng], 8, { duration: 0.8 });
  }, []);

  const handleLatChange = useCallback((val: string) => {
    setLatitude(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= -90 && num <= 90) {
      const clampedLng = parseFloat(longitude) || 0;
      setEpicenter([num, clampedLng]);
    }
  }, [longitude]);

  const handleLngChange = useCallback((val: string) => {
    setLongitude(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= -180 && num <= 180) {
      const clampedLat = parseFloat(latitude) || 0;
      setEpicenter([clampedLat, num]);
    }
  }, [latitude]);

  const matchedCity = NZ_CITIES.find(
    (c) =>
      Math.abs(c.lat - epicenter[0]) < 0.05 &&
      Math.abs(c.lng - epicenter[1]) < 0.05
  );

  const handleSimulate = async () => {
    if (mag < 4 || !epicenter) return;
    const publicId = `sim-admin-${Date.now()}`;

    await simulateEarthquake({
      magnitude: SCALE.toMagnitude(mag),
      latitude: SCALE.toLatLng(epicenter[0]),
      longitude: SCALE.toLatLng(epicenter[1]),
      depth: BigInt(Math.round(depthNum)),
      publicId,
    })
      .then(() => {
        setHistory((prev) => [
          {
            id: publicId,
            magnitude: mag,
            lat: epicenter[0],
            lng: epicenter[1],
            depth: depthNum,
            radiusKm,
            city: matchedCity?.name || `${epicenter[0].toFixed(3)}, ${epicenter[1].toFixed(3)}`,
            txHash: txHash || "",
            timestamp: new Date(),
          },
          ...prev.slice(0, 9),
        ]);
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink-900">Admin Panel</h1>
          <p className="text-ink-600 mt-1">
            Simulate earthquakes at specific regions and monitor pool health.
            Requires your wallet to be the configured oracle.
          </p>
        </div>

        {!chainConfigured && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 text-sm mb-6">
            Connect to Sepolia or Fuji to use admin features.
          </div>
        )}

        {/* ── Pool Health ──────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-ink-100 shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-ink-100">
            <h2 className="text-lg font-semibold text-ink-900">Pool Health</h2>
          </div>
          <div className="p-6">
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-20 bg-ink-50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Pool Balance"
                  value={`$${SCALE.fromDNZD(stats.balance).toLocaleString()}`}
                  accent
                />
                <StatCard
                  label="Total Premiums"
                  value={`$${SCALE.fromDNZD(stats.totalPremiums).toLocaleString()}`}
                />
                <StatCard
                  label="Total Payouts"
                  value={`$${SCALE.fromDNZD(stats.totalPayouts).toLocaleString()}`}
                />
                <StatCard
                  label="Active Policies"
                  value={stats.activePolicies.toString()}
                />
                <StatCard
                  label="Active Coverage"
                  value={`$${SCALE.fromDNZD(stats.totalActiveCoverage).toLocaleString()}`}
                />
                <StatCard
                  label="Reserve Ratio"
                  value={
                    reserveRatio !== null
                      ? `${reserveRatio.toFixed(0)}%`
                      : "∞"
                  }
                  highlight={
                    reserveRatio !== null && reserveRatio < 150
                      ? "red"
                      : reserveRatio !== null && reserveRatio < 200
                      ? "yellow"
                      : "green"
                  }
                />
                <StatCard
                  label="Profit/Loss"
                  value={`$${SCALE.fromDNZD(stats.totalPremiums - stats.totalPayouts).toLocaleString()}`}
                  highlight={
                    stats.totalPremiums > stats.totalPayouts ? "green" : "red"
                  }
                />
              </div>
            ) : (
              <p className="text-ink-400 text-sm">No pool data available.</p>
            )}
          </div>
        </section>

        {/* ── Simulate Earthquake ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Map + Controls */}
          <section className="lg:col-span-3 bg-white rounded-2xl border border-ink-100 shadow-sm">
            <div className="px-6 py-4 border-b border-ink-100">
              <h2 className="text-lg font-semibold text-ink-900">
                Simulate Earthquake
              </h2>
              <p className="text-sm text-ink-500 mt-1">
                Click on the map to place the epicenter, or select a city preset.
                Triggers <code>recordEarthquake()</code> on-chain.
              </p>
            </div>
            <div className="p-6">
              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-ink-500 mb-4">
                    Connect your wallet to simulate an earthquake.
                  </p>
                  <ConnectButton />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Map */}
                  <div className="rounded-xl overflow-hidden border border-ink-200">
                    <AdminSimMap
                      epicenter={epicenter}
                      radiusKm={radiusKm}
                      magnitude={mag}
                      onMapClick={handleMapClick}
                    />
                  </div>
                  <p className="text-xs text-ink-400 -mt-4">
                    Click anywhere on the map to set the epicenter. Drag to pan, scroll to zoom.
                  </p>

                  {/* City presets */}
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-2">
                      City Presets
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {NZ_CITIES.map((c) => {
                        const isActive =
                          Math.abs(c.lat - epicenter[0]) < 0.05 &&
                          Math.abs(c.lng - epicenter[1]) < 0.05;
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleCitySelect(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              isActive
                                ? "bg-shield-50 border-shield-300 text-shield-700"
                                : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom coordinates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="-90"
                        max="90"
                        value={latitude}
                        onChange={(e) => handleLatChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 font-mono focus:border-shield-400 focus:ring-1 focus:ring-shield-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="-180"
                        max="180"
                        value={longitude}
                        onChange={(e) => handleLngChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 font-mono focus:border-shield-400 focus:ring-1 focus:ring-shield-400 outline-none"
                      />
                    </div>
                  </div>
                  {matchedCity && (
                    <p className="text-xs text-shield-600 -mt-2">
                      Detected city: {matchedCity.name} ({matchedCity.region})
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Right: Parameters + Submit */}
          <section className="lg:col-span-2 space-y-6">
            {/* Magnitude */}
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
              <label className="block text-sm font-semibold text-ink-700 mb-3 uppercase tracking-wide">
                Magnitude
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {MAGNITUDE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setMagnitude(String(preset.value))}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                      magnitude === String(preset.value)
                        ? "bg-quake-50 border-quake-300 text-quake-700 ring-1 ring-quake-200"
                        : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={magnitude}
                onChange={(e) => setMagnitude(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 focus:border-shield-400 focus:ring-1 focus:ring-shield-400 outline-none"
                placeholder="Custom magnitude"
              />
              {mag > 0 && (
                <p className="mt-2 text-xs text-ink-400">
                  {mag >= 7 ? "Catastrophic" : mag >= 6 ? "Severe" : mag >= 5 ? "Moderate" : "Light"} — radius {radiusKm}km
                </p>
              )}
            </div>

            {/* Depth + Radius */}
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
              <label className="block text-sm font-semibold text-ink-700 mb-3 uppercase tracking-wide">
                Depth & Radius
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">
                    Depth (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="700"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 focus:border-shield-400 focus:ring-1 focus:ring-shield-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-2">
                    Affect Radius
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {RADIUS_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setRadiusKm(preset.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          radiusKm === preset.value
                            ? "bg-shield-50 border-shield-300 text-shield-700"
                            : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full accent-shield-600"
                  />
                  <div className="flex justify-between text-xs text-ink-400 mt-1">
                    <span>10km</span>
                    <span className="font-medium text-ink-600">{radiusKm}km</span>
                    <span>500km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary + Submit */}
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6">
              <label className="block text-sm font-semibold text-ink-700 mb-3 uppercase tracking-wide">
                Simulation Summary
              </label>
              <div className="bg-ink-50 rounded-xl p-4 text-sm text-ink-600 mb-4 space-y-1">
                <div>
                  <span className="font-medium text-ink-800">Epicenter:</span>{" "}
                  {matchedCity?.name || "Custom location"} ({epicenter[0].toFixed(4)}, {epicenter[1].toFixed(4)})
                </div>
                <div>
                  <span className="font-medium text-ink-800">Magnitude:</span>{" "}
                  M{mag.toFixed(1)}
                </div>
                <div>
                  <span className="font-medium text-ink-800">Depth:</span>{" "}
                  {depthNum} km
                </div>
                <div>
                  <span className="font-medium text-ink-800">Radius:</span>{" "}
                  {radiusKm} km — policies within this area with trigger ≤ M{mag.toFixed(1)} will auto-payout.
                </div>
              </div>

              <button
                onClick={handleSimulate}
                disabled={isPending || !chainConfigured || mag < 4 || !isConnected}
                className="w-full bg-quake-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-quake-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Recording on-chain...
                  </span>
                ) : (
                  "Simulate Earthquake"
                )}
              </button>

              {(step === "done" || step === "error") && (
                <button
                  onClick={reset}
                  className="w-full mt-2 text-sm font-medium text-ink-500 hover:text-ink-700 py-2"
                >
                  Reset
                </button>
              )}

              {step === "done" && txHash && (
                <div className="mt-4 bg-shield-50 border border-shield-200 text-shield-800 rounded-xl p-4 text-sm">
                  Earthquake recorded! Check{" "}
                  <a href="/quakes" className="font-semibold underline">
                    Live Quakes
                  </a>{" "}
                  to see payouts.
                  <a
                    href={`${getExplorerUrl(chainId)}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-1 text-xs text-shield-500 font-mono hover:text-shield-700"
                  >
                    Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </div>
              )}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
                  {error}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Simulation History ──────────────────────────────────────── */}
        {history.length > 0 && (
          <section className="mt-8 bg-white rounded-2xl border border-ink-100 shadow-sm">
            <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">Recent Simulations</h2>
                <p className="text-sm text-ink-500 mt-0.5">Last {history.length} earthquakes simulated in this session</p>
              </div>
            </div>
            <div className="divide-y divide-ink-50">
              {history.map((sim) => (
                <div key={sim.id} className="px-6 py-3.5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-quake-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {sim.magnitude.toFixed(1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink-900 text-sm">{sim.city}</div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {sim.lat.toFixed(4)}, {sim.lng.toFixed(4)} · {sim.depth}km deep · {sim.radiusKm}km radius
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-ink-500">{sim.timestamp.toLocaleTimeString()}</div>
                    {sim.txHash && (
                      <a
                        href={`${getExplorerUrl(chainId)}/tx/${sim.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-shield-600 hover:text-shield-700 font-mono"
                      >
                        View tx
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: "green" | "yellow" | "red";
}) {
  const colorClass =
    highlight === "red"
      ? "text-red-600"
      : highlight === "yellow"
      ? "text-amber-600"
      : highlight === "green"
      ? "text-shield-600"
      : accent
      ? "text-shield-600"
      : "text-ink-900";

  return (
    <div className="bg-ink-50 rounded-xl p-4">
      <div className={`text-xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-ink-500 mt-1 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
