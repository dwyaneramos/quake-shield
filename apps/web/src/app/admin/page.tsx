"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { useSimulateEarthquake } from "@/lib/hooks/useSimulateEarthquake";
import { usePoolStats } from "@/lib/hooks/useQuakeShield";
import { isChainConfigured, getContracts } from "@/lib/contracts";
import { NZ_CITIES, CITY_RADIUS_KM } from "@/lib/cities";
import { SCALE } from "@/types";

const MAGNITUDE_PRESETS = [
  { label: "M5.0", value: 5.0 },
  { label: "M5.5", value: 5.5 },
  { label: "M6.0", value: 6.0 },
  { label: "M6.5", value: 6.5 },
  { label: "M7.0", value: 7.0 },
];

export default function AdminPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfigured = isChainConfigured(chainId);
  const { QUAKESHIELD_ADDRESS } = getContracts(chainId);
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

  const [selectedCity, setSelectedCity] = useState("wellington");
  const [magnitude, setMagnitude] = useState("6.0");
  const [depth, setDepth] = useState("10");
  const [publicId, setPublicId] = useState(`sim-${Date.now()}`);

  const city = NZ_CITIES.find((c) => c.id === selectedCity);

  const reserveRatio =
    stats && stats.totalActiveCoverage > 0n
      ? Number((stats.balance * 10000n) / stats.totalActiveCoverage) / 100
      : null;

  const handleSimulate = async () => {
    if (!city) return;
    const mag = parseFloat(magnitude);
    if (isNaN(mag) || mag < 4) return;

    await simulateEarthquake({
      magnitude: SCALE.toMagnitude(mag),
      latitude: SCALE.toLatLng(city.lat),
      longitude: SCALE.toLatLng(city.lng),
      depth: BigInt(Math.round(parseFloat(depth) || 10)),
      publicId: publicId || `sim-${Date.now()}`,
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink-900">Admin Panel</h1>
          <p className="text-ink-600 mt-1">
            Simulate earthquakes and monitor pool health. The simulate feature
            requires your wallet to be the configured oracle.
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
                {[1, 2, 3, 4].map((i) => (
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
                  label="Total Shares"
                  value={stats.totalShares.toString()}
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
        <section className="bg-white rounded-2xl border border-ink-100 shadow-sm">
          <div className="px-6 py-4 border-b border-ink-100">
            <h2 className="text-lg font-semibold text-ink-900">
              Simulate Earthquake
            </h2>
            <p className="text-sm text-ink-500 mt-1">
              Triggers <code>recordEarthquake()</code> on-chain — pays out any
              matching active policies automatically.
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
                {/* City picker */}
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    Epicenter City
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {NZ_CITIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCity(c.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          selectedCity === c.id
                            ? "bg-shield-50 border-shield-300 text-shield-700"
                            : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                  {city && (
                    <p className="mt-2 text-xs text-ink-400">
                      {city.lat.toFixed(4)}, {city.lng.toFixed(4)} — {CITY_RADIUS_KM}km radius
                    </p>
                  )}
                </div>

                {/* Magnitude */}
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    Magnitude
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {MAGNITUDE_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setMagnitude(String(preset.value))}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                          magnitude === String(preset.value)
                            ? "bg-quake-50 border-quake-300 text-quake-700"
                            : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <input
                      type="number"
                      step="0.1"
                      min="4"
                      max="10"
                      value={magnitude}
                      onChange={(e) => setMagnitude(e.target.value)}
                      className="w-20 px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 focus:border-shield-400 focus:ring-1 focus:ring-shield-400 outline-none"
                    />
                  </div>
                </div>

                {/* Depth + public ID */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-2">
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
                    <label className="block text-sm font-medium text-ink-700 mb-2">
                      Event ID
                    </label>
                    <input
                      type="text"
                      value={publicId}
                      onChange={(e) => setPublicId(e.target.value)}
                      placeholder="sim-12345"
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 focus:border-shield-400 focus:ring-1 focus:ring-shield-400 outline-none"
                    />
                  </div>
                </div>

                {/* Summary */}
                {city && (
                  <div className="bg-ink-50 rounded-xl p-4 text-sm text-ink-600">
                    <span className="font-semibold text-ink-800">
                      Simulating:
                    </span>{" "}
                    M{magnitude} earthquake at {city.name}, {depth}km deep, within {CITY_RADIUS_KM}km
                    radius. Any active policy in this area with a trigger ≤ M{magnitude} will
                    auto-payout.
                  </div>
                )}

                {/* Submit */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSimulate}
                    disabled={isPending || !chainConfigured}
                    className="bg-quake-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-quake-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Recording..." : "Simulate Earthquake"}
                  </button>
                  {(step === "done" || step === "error") && (
                    <button
                      onClick={reset}
                      className="text-sm font-medium text-ink-500 hover:text-ink-700"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Result */}
                {step === "done" && txHash && (
                  <div className="bg-shield-50 border border-shield-200 text-shield-800 rounded-xl p-4 text-sm">
                    Earthquake recorded! Check the{" "}
                    <a
                      href={`/quakes`}
                      className="font-semibold underline"
                    >
                      Live Quakes
                    </a>{" "}
                    page and the dashboard to see any payouts.
                    <span className="block mt-1 text-xs text-shield-500 font-mono">
                      Tx: {txHash}
                    </span>
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
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
  const colorClass = highlight === "red"
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
