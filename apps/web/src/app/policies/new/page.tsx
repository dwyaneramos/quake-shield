"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect, Suspense, useCallback } from "react";
import { useAccount, useChainId } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { isChainConfigured } from "@/lib/contracts";
import { useBuyPolicy } from "@/lib/hooks/useBuyPolicy";
import { getExplorerUrl } from "@/lib/chains";
import { NZ_CITIES, CITY_RADIUS_KM } from "@/lib/cities";
import { SCALE } from "@/types";

const REGIONS = [
  ...NZ_CITIES.map((c) => ({ label: c.name, id: c.id, lat: c.lat, lng: c.lng })),
  { label: "Custom location", id: "custom", lat: null, lng: null },
] as const;

interface TrendPoint {
  time: string;
  probability: number;
  quakeCount: number;
  maxMagnitude: number;
}

interface CityData {
  currentProbability: number;
  recentQuakeCount: number;
  trend: TrendPoint[];
}

function CityMiniGraph({ cityId }: { cityId: string }) {
  const [data, setData] = useState<CityData | null>(null);

  const fetchCity = useCallback(async () => {
    try {
      const res = await fetch(`/api/geonet/city?city=${cityId}`);
      if (res.ok) setData(await res.json());
    } catch {}
  }, [cityId]);

  useEffect(() => {
    fetchCity();
    const i = setInterval(fetchCity, 30000);
    return () => clearInterval(i);
  }, [fetchCity]);

  const trend = data?.trend ?? [];
  const prob = data?.currentProbability ?? 0;
  const dataMax = trend.length > 0 ? Math.max(...trend.map((p) => p.probability)) : 0.01;
  const yMax = Math.max(dataMax * 1.3, 0.001);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-ink-200 overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <p className="text-ink-500 text-xs font-medium uppercase tracking-wider">
          30-Day Seismic Trend
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-4xl font-black tabular-nums text-shield-600">
            {prob.toFixed(4)}
          </span>
          <span className="text-lg font-bold text-ink-400">%</span>
          <span className="text-ink-500 text-sm ml-1">M5+ probability</span>
        </div>
      </div>
      <div className="px-2 pb-2 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#15805c" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#15805c" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9edf3" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#aab8cc"
              tick={{ fill: "#7c8fab", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              stroke="#aab8cc"
              tick={{ fill: "#7c8fab", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(2)}%`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #d1dae5",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) => [`${Number(value).toFixed(4)}%`, "Probability"]}
            />
            <Area
              type="monotone"
              dataKey="probability"
              stroke="#15805c"
              strokeWidth={2}
              fill="url(#buyGrad)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="px-6 py-3 bg-ink-50/50 border-t border-ink-100 grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <p className="text-ink-900 font-semibold">{data?.recentQuakeCount ?? "--"}</p>
          <p className="text-ink-400">quakes past 30d</p>
        </div>
        <div>
          <p className="text-ink-900 font-semibold">{CITY_RADIUS_KM}km</p>
          <p className="text-ink-400">radius</p>
        </div>
        <div>
          <p className="text-ink-900 font-semibold">M{magnitudeDisplay}</p>
          <p className="text-ink-400">your trigger</p>
        </div>
      </div>
    </div>
  );
}

let magnitudeDisplay = "6.0";

function BuyPolicyForm() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get("city");

  const initialIndex = useMemo(() => {
    if (!initialCity) return 0;
    const idx = NZ_CITIES.findIndex((c) => c.id === initialCity);
    return idx >= 0 ? idx : 0;
  }, [initialCity]);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfigured = isChainConfigured(chainId);
  const { openConnectModal } = useConnectModal();
  const { buyPolicy, step, error, isPending, buyTxHash, reset } = useBuyPolicy();

  const [regionIndex, setRegionIndex] = useState(initialIndex);
  const [customLat, setCustomLat] = useState("-41.2865");
  const [customLng, setCustomLng] = useState("174.7762");
  const [coverage, setCoverage] = useState("1000");
  const [magnitude, setMagnitude] = useState("6.0");
  const [radius, setRadius] = useState("50");

  magnitudeDisplay = magnitude;

  const region = REGIONS[regionIndex];
  const isCustom = region.lat === null;
  const lat = isCustom ? customLat : String(region.lat);
  const lng = isCustom ? customLng : String(region.lng);
  const selectedCityId = isCustom ? "wellington" : region.id;

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

  const canSubmit = isConnected && chainConfigured && !validation && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await buyPolicy({
      coverageAmount: SCALE.toUSDC(coverageNum),
      triggerMagnitude: SCALE.toMagnitude(magnitudeNum),
      centerLat: SCALE.toLatLng(Number(lat)),
      centerLng: SCALE.toLatLng(Number(lng)),
      radiusKm: BigInt(Math.round(radiusNum)),
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-2">Buy Earthquake Policy</h1>
        <p className="text-ink-600 mb-8">Set your trigger conditions and coverage amount.</p>

        {!chainConfigured && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm">
            QuakeShield isn&rsquo;t deployed on this network, so purchases are disabled. Switch networks in
            your wallet, or set the contract addresses in the root <code>.env</code> to enable buying.
          </div>
        )}

        {step === "done" ? (
          <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center">
            <div className="w-16 h-16 bg-shield-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-ink-900 mb-2">Policy purchased</h2>
            <p className="text-ink-600 mb-6">You&rsquo;re covered. You&rsquo;ll be paid automatically if the trigger fires.</p>
            {buyTxHash && (
              <a
                href={`${getExplorerUrl(chainId)}/tx/${buyTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-shield-600 hover:text-shield-700 block mb-6"
              >
                View transaction on the block explorer →
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
          <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-ink-100 p-8 h-fit">
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
                  {REGIONS.map((r, i) => (
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
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Radius (km)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm text-ink-900 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
              />
            </div>

            {/* Summary */}
            <div className="bg-ink-50 rounded-lg p-4 border border-ink-100 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-500">Coverage</span>
                <span className="font-medium text-ink-900">{coverageNum.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Payout if triggered</span>
                <span className="font-semibold text-shield-700">{coverageNum.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Premium</span>
                <span className="font-medium text-ink-900">{premium.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Trigger</span>
                <span className="font-medium text-ink-900">M≥{magnitudeNum.toFixed(1)} · {radiusNum}km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Location</span>
                <span className="font-medium text-ink-900">{region.label}</span>
              </div>
            </div>

            {validation && <p className="text-sm text-quake-700 bg-quake-50 border border-quake-200 rounded-lg px-3 py-2">{validation}</p>}
            {error && <p className="text-sm text-quake-700 bg-quake-50 border border-quake-200 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              onClick={(e) => {
                if (!isConnected) {
                  e.preventDefault();
                  openConnectModal?.();
                }
              }}
              className="w-full bg-shield-600 text-white py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors"
            >
              {step === "approving" ? "Approving USDC…" : step === "buying" ? "Buying policy…" : "Buy Policy"}
            </button>
          </form>
        </div>

        {/* Right: City Data */}
        <div className="lg:col-span-3">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-ink-900">
              {isCustom ? "Custom Location" : region.label}
            </h2>
            <p className="text-ink-500 text-sm">Live seismic data for this area</p>
          </div>
            <CityMiniGraph cityId={selectedCityId} />
          </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BuyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Suspense>
        <BuyPolicyForm />
      </Suspense>
    </div>
  );
}
