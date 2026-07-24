"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { Header } from "@/components/layout/Header";
import { CONTRACTS_CONFIGURED } from "@/lib/contracts";
import { useBuyPolicy } from "@/lib/hooks/useBuyPolicy";
import { POLYGON_AMOY } from "@/lib/polygon";
import { SCALE } from "@/types";

const NZ_REGIONS = [
  { label: "Wellington", lat: -41.2865, lng: 174.7762 },
  { label: "Christchurch / Canterbury", lat: -43.5321, lng: 172.6362 },
  { label: "Auckland", lat: -36.8485, lng: 174.7633 },
  { label: "Kaikōura", lat: -42.4, lng: 173.68 },
  { label: "Dunedin", lat: -45.8788, lng: 170.5028 },
  { label: "Hamilton", lat: -37.787, lng: 175.2793 },
  { label: "Custom location", lat: null, lng: null },
] as const;

export default function BuyPolicyPage() {
  const { isConnected } = useAccount();
  const { buyPolicy, step, error, isPending, buyTxHash, reset } = useBuyPolicy();

  const [regionIndex, setRegionIndex] = useState(0);
  const [customLat, setCustomLat] = useState("-41.2865");
  const [customLng, setCustomLng] = useState("174.7762");
  const [coverage, setCoverage] = useState("1000");
  const [magnitude, setMagnitude] = useState("6.0");
  const [radius, setRadius] = useState("50");

  const region = NZ_REGIONS[regionIndex];
  const isCustom = region.lat === null;
  const lat = isCustom ? customLat : String(region.lat);
  const lng = isCustom ? customLng : String(region.lng);

  const coverageNum = Number(coverage) || 0;
  const magnitudeNum = Number(magnitude) || 0;
  const radiusNum = Number(radius) || 0;
  const premium = coverageNum * 0.01;

  const validation = useMemo(() => {
    if (coverageNum <= 0) return "Coverage must be greater than 0";
    if (magnitudeNum < 4.0) return "Minimum trigger magnitude is 4.0";
    if (radiusNum <= 0 || radiusNum > 500) return "Radius must be between 1 and 500km";
    if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return "Enter a valid latitude/longitude";
    return null;
  }, [coverageNum, magnitudeNum, radiusNum, lat, lng]);

  const canSubmit = isConnected && CONTRACTS_CONFIGURED && !validation && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await buyPolicy({
      coverageAmount: SCALE.toUSDC(coverageNum),
      triggerMagnitude: SCALE.toMagnitude(magnitudeNum),
      centerLat: SCALE.toLatLng(Number(lat)),
      centerLng: SCALE.toLatLng(Number(lng)),
      radiusKm: BigInt(Math.round(radiusNum)),
    }).catch(() => {
      /* surfaced via `error` state */
    });
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-2">Buy Earthquake Policy</h1>
        <p className="text-ink-600 mb-8">Set your trigger conditions and coverage amount.</p>

        {!CONTRACTS_CONFIGURED && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm">
            Contracts aren&rsquo;t deployed yet, so purchases are disabled. Set the contract addresses in{" "}
            <code>apps/web/.env.local</code> to enable buying.
          </div>
        )}

        {step === "done" ? (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center">
            <div className="w-16 h-16 bg-shield-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-ink-900 mb-2">Policy purchased</h2>
            <p className="text-ink-600 mb-6">You&rsquo;re covered. You&rsquo;ll be paid automatically if the trigger fires.</p>
            {buyTxHash && (
              <a
                href={`${POLYGON_AMOY.blockExplorers.default.url}/tx/${buyTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-shield-600 hover:text-shield-700 block mb-6"
              >
                View transaction on Polygonscan →
              </a>
            )}
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard" className="bg-shield-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-shield-700 transition-colors">
                Go to Dashboard
              </Link>
              <button
                onClick={reset}
                type="button"
                className="bg-ink-100 text-ink-700 px-6 py-2 rounded-lg font-semibold hover:bg-ink-200 transition-colors"
              >
                Buy Another Policy
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8">
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              {/* Coverage Amount */}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Coverage Amount (USDC)</label>
                <input
                  type="number"
                  min={0}
                  value={coverage}
                  onChange={(e) => setCoverage(e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                />
                <p className="text-sm text-ink-500 mt-1">Premium: 1% of coverage (paid in USDC)</p>
              </div>

              {/* Trigger Magnitude */}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Minimum Trigger Magnitude</label>
                <input
                  type="number"
                  step="0.1"
                  min={4}
                  value={magnitude}
                  onChange={(e) => setMagnitude(e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                />
                <p className="text-sm text-ink-500 mt-1">Payout triggers when earthquake magnitude meets or exceeds this value (min 4.0)</p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Coverage Center</label>
                <select
                  value={regionIndex}
                  onChange={(e) => setRegionIndex(Number(e.target.value))}
                  className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500 mb-3"
                >
                  {NZ_REGIONS.map((r, i) => (
                    <option key={r.label} value={i}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {isCustom && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ink-500 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={customLat}
                        onChange={(e) => setCustomLat(e.target.value)}
                        className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-500 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={customLng}
                        onChange={(e) => setCustomLng(e.target.value)}
                        className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Radius */}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Coverage Radius (km)</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                />
                <p className="text-sm text-ink-500 mt-1">How far from the center point should coverage extend? (1-500 km)</p>
              </div>

              {/* Summary */}
              <div className="bg-ink-50 rounded-lg p-4">
                <h3 className="font-medium text-ink-900 mb-2">Policy Summary</h3>
                <div className="text-sm text-ink-600 space-y-1">
                  <p>
                    Coverage: <span className="font-medium">{coverageNum.toLocaleString()} USDC</span>
                  </p>
                  <p>
                    Premium (1%): <span className="font-medium">{premium.toLocaleString()} USDC</span>
                  </p>
                  <p>
                    Trigger:{" "}
                    <span className="font-medium">
                      Magnitude ≥ {magnitudeNum.toFixed(1)} within {radiusNum || "--"}km of {region.label}
                    </span>
                  </p>
                </div>
              </div>

              {validation && <p className="text-sm text-quake-700">{validation}</p>}
              {error && <p className="text-sm text-quake-700">{error}</p>}

              {!isConnected ? (
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full bg-shield-600 text-white py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {step === "approving"
                    ? "Approving USDC…"
                    : step === "buying"
                      ? "Buying policy…"
                      : "Buy Policy"}
                </button>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
