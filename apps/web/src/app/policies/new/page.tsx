"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
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
import { usePoolStats } from "@/lib/hooks/useQuakeShield";
import { useRegions } from "@/lib/hooks/useInvestments";
import { getExplorerUrl } from "@/lib/chains";
import { NZ_CITIES } from "@/lib/cities";
import { NZ_REGIONS, regionsForPoint, regionCenter } from "@quakeshield/shared";
import { SCALE } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";

const RegionMap = dynamic(
  () => import("@/components/policies/RegionMap").then((mod) => mod.RegionMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[320px] w-full rounded-xl" />,
  },
);

const MAX_COVERAGE_DNZD = 10_000;

// Policies trigger on any GeoNet quake M5.0+ whose epicenter falls inside the
// chosen region's real boundary — the exact same test that governs that
// region's investors, so a policy and the capital backing it always agree on
// what counts as "this region got hit." Not user-configurable, so risk terms
// stay consistent across the pool.
const TRIGGER_MAGNITUDE = 5.0;

interface RegionOption {
  regionId: number;
  id: string;
  name: string;
  island: string;
}

const REGION_OPTIONS: RegionOption[] = NZ_REGIONS.map((r, i) => ({
  regionId: i,
  id: r.id,
  name: r.name,
  island: r.island,
})).sort((a, b) => a.name.localeCompare(b.name));

/** ?city= is kept for old links (dashboard widgets, city graphs) — resolve it to the region that contains that city. */
function regionIdForCityId(cityId: string): number | null {
  const city = NZ_CITIES.find((c) => c.id === cityId);
  if (!city) return null;
  const [region] = regionsForPoint(city.lat, city.lng);
  if (!region) return null;
  const index = NZ_REGIONS.findIndex((r) => r.id === region.id);
  return index >= 0 ? index : null;
}

interface TrendPoint {
  time: string;
  quakeCount: number;
  maxMagnitude: number;
}

interface RegionSeismicData {
  quakeCount: number;
  maxMagnitude: number;
  estimatedRiskScoreBps: number;
  trend: TrendPoint[];
}

function RegionMiniGraph({ regionSlug }: { regionSlug: string }) {
  const [data, setData] = useState<RegionSeismicData | null>(null);

  const fetchRegion = useCallback(async () => {
    try {
      const res = await fetch(`/api/geonet/regions?region=${regionSlug}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.regions ?? null);
      }
    } catch {}
  }, [regionSlug]);

  useEffect(() => {
    fetchRegion();
    const i = setInterval(fetchRegion, 30000);
    return () => clearInterval(i);
  }, [fetchRegion]);

  const trend = data?.trend ?? [];
  const riskPct = (data?.estimatedRiskScoreBps ?? 0) / 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-ink-200 overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <p className="text-ink-500 text-xs font-medium uppercase tracking-wider">
          90-Day Seismic Activity
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-4xl font-black tabular-nums text-shield-600">
            {riskPct.toFixed(1)}
          </span>
          <span className="text-lg font-bold text-ink-400">%</span>
          <span className="text-ink-500 text-sm ml-1">risk score</span>
        </div>
      </div>
      <div className="px-2 pb-2 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trend}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#15805c" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#15805c" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e9edf3"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              stroke="#aab8cc"
              tick={{ fill: "#7c8fab", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              stroke="#aab8cc"
              tick={{ fill: "#7c8fab", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #d1dae5",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) => [`${value}`, "Quakes"]}
            />
            <Area
              type="monotone"
              dataKey="quakeCount"
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
          <p className="text-ink-900 font-semibold">
            {data?.quakeCount ?? "--"}
          </p>
          <p className="text-ink-400">quakes past 90d</p>
        </div>
        <div>
          <p className="text-ink-900 font-semibold">
            M{data?.maxMagnitude ? data.maxMagnitude.toFixed(1) : "--"}
          </p>
          <p className="text-ink-400">largest</p>
        </div>
        <div>
          <p className="text-ink-900 font-semibold">M{magnitudeDisplay}</p>
          <p className="text-ink-400">your trigger</p>
        </div>
      </div>
    </div>
  );
}

const magnitudeDisplay = TRIGGER_MAGNITUDE.toFixed(1);

function BuyPolicyForm() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get("city");
  const initialRegionParam = searchParams.get("region");

  const initialRegionId = useMemo(() => {
    if (initialRegionParam) {
      const idx = NZ_REGIONS.findIndex((r) => r.id === initialRegionParam);
      if (idx >= 0) return idx;
    }
    if (initialCity) {
      const idx = regionIdForCityId(initialCity);
      if (idx !== null) return idx;
    }
    return 0;
  }, [initialCity, initialRegionParam]);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfigured = isChainConfigured(chainId);
  const { openConnectModal } = useConnectModal();
  const { buyPolicy, step, error, isPending, buyTxHash, reset } =
    useBuyPolicy();
  const { stats } = usePoolStats();
  const { regions: onChainRegions } = useRegions();

  const [paymentPlan, setPaymentPlan] = useState<"onetime" | "recurring">(
    "onetime",
  );
  const [regionId, setRegionId] = useState(initialRegionId);
  const [coverage, setCoverage] = useState("1000");

  const regionMeta = NZ_REGIONS[regionId];
  const onChainRegion = onChainRegions.find((r) => r.id === regionId);
  const center = regionCenter(regionMeta);

  const coverageNum = Number(coverage) || 0;
  const premium = coverageNum * 0.01;

  const validation = useMemo(() => {
    if (coverageNum <= 0) return "Coverage must be greater than 0";
    if (coverageNum > MAX_COVERAGE_DNZD)
      return `Maximum coverage is ${MAX_COVERAGE_DNZD.toLocaleString()} DNZD`;
    if (onChainRegions.length > 0 && !onChainRegion)
      return "This region isn't registered on-chain yet on the connected network";
    return null;
  }, [coverageNum, onChainRegion, onChainRegions.length]);

  const canSubmit = isConnected && chainConfigured && !validation && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await buyPolicy({
      coverageAmount: SCALE.toDNZD(coverageNum),
      triggerMagnitude: SCALE.toMagnitude(TRIGGER_MAGNITUDE),
      regionId: BigInt(regionId),
      recurring: paymentPlan === "recurring",
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-2">
          Buy Earthquake Policy
        </h1>
        <p className="text-ink-600 mb-8">
          Choose your coverage amount and region. Every policy pays out
          automatically on any GeoNet quake M{TRIGGER_MAGNITUDE.toFixed(1)}+
          inside your region &mdash; the same region investors back at{" "}
          <Link href="/investments" className="text-shield-600 hover:text-shield-700 font-medium">
            /investments
          </Link>
          .
        </p>

        {!chainConfigured && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm">
            QuakeShield isn&rsquo;t deployed on this network, so purchases are
            disabled. Switch networks in your wallet, or set the contract
            addresses in the root <code>.env</code> to enable buying.
          </div>
        )}

        {step === "done" ? (
          <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center">
            <div className="w-16 h-16 bg-shield-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-shield-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-ink-900 mb-2">
              Policy purchased
            </h2>
            <p className="text-ink-600 mb-6">
              You&rsquo;re covered. You&rsquo;ll be paid automatically if the
              trigger fires.{" "}
              {paymentPlan === "recurring"
                ? "Come back to Policies every 14 days to renew — coverage lapses if the premium isn't paid."
                : "Coverage runs for 14 days and then expires — buy a new policy or switch to Recurring to keep it going."}
            </p>
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
              <Link
                href="/dashboard"
                className="bg-shield-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-shield-700 transition-colors"
              >
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
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    Coverage Amount (DNZD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={MAX_COVERAGE_DNZD}
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                    className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                  />
                  <p className="text-sm text-ink-500 mt-1">
                    Premium: 1% of coverage · Max:{" "}
                    {MAX_COVERAGE_DNZD.toLocaleString()} DNZD
                  </p>
                  {stats && stats.totalActiveCoverage > 0n && (
                    <p className="text-xs text-ink-400 mt-1">
                      Pool utilization:{" "}
                      {(
                        (Number(stats.totalActiveCoverage) /
                          Number(stats.balance)) *
                        100
                      ).toFixed(0)}
                      %
                    </p>
                  )}
                </div>

                {/* Trigger Magnitude (fixed, not user-configurable) */}
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    Minimum Trigger Magnitude
                  </label>
                  <div className="w-full border border-ink-200 bg-ink-50 rounded-lg px-4 py-3 text-ink-700 font-medium">
                    M{TRIGGER_MAGNITUDE.toFixed(1)}
                  </div>
                  <p className="text-sm text-ink-500 mt-1">
                    Fixed for every policy — not user-adjustable.
                  </p>
                </div>

                {/* Region */}
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    Coverage Region
                  </label>
                  <select
                    value={regionId}
                    onChange={(e) => setRegionId(Number(e.target.value))}
                    className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                  >
                    {REGION_OPTIONS.map((r) => (
                      <option key={r.id} value={r.regionId}>
                        {r.name} · {r.island}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-ink-500 mt-1">
                    Payout triggers on any qualifying quake inside this
                    region&rsquo;s boundary — the same one investors back.
                  </p>
                </div>

                {/* Payment Plan */}
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">
                    Payment Plan
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentPlan("onetime")}
                      className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                        paymentPlan === "onetime"
                          ? "bg-shield-600 text-white"
                          : "bg-ink-100 text-ink-600"
                      }`}
                    >
                      One-off
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPlan("recurring")}
                      className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                        paymentPlan === "recurring"
                          ? "bg-shield-600 text-white"
                          : "bg-ink-100 text-ink-600"
                      }`}
                    >
                      Recurring
                    </button>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">
                    {paymentPlan === "onetime"
                      ? "Pay the premium once; coverage runs for 14 days and then expires — it can't be renewed."
                      : "1% premium billed every 14 days. Renew from Policies before it lapses, or approve a larger allowance upfront so you just need to click renew."}
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-ink-50 rounded-lg p-4 border border-ink-100 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Coverage</span>
                    <span className="font-medium text-ink-900">
                      {coverageNum.toLocaleString()} DNZD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Payout if triggered</span>
                    <span className="font-semibold text-shield-700">
                      {coverageNum.toLocaleString()} DNZD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Premium</span>
                    <span className="font-medium text-ink-900">
                      {premium.toLocaleString()} DNZD
                      {paymentPlan === "recurring" ? " / 14 days" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Coverage period</span>
                    <span className="font-medium text-ink-900">
                      {paymentPlan === "recurring"
                        ? "14 days, auto-renews"
                        : "14 days, then expires"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Trigger</span>
                    <span className="font-medium text-ink-900">
                      M≥{TRIGGER_MAGNITUDE.toFixed(1)} in region
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Region</span>
                    <span className="font-medium text-ink-900">
                      {regionMeta.name}
                    </span>
                  </div>
                </div>

                {validation && (
                  <p className="text-sm text-quake-700 bg-quake-50 border border-quake-200 rounded-lg px-3 py-2">
                    {validation}
                  </p>
                )}
                {error && (
                  <p className="text-sm text-quake-700 bg-quake-50 border border-quake-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

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
                  {step === "approving"
                    ? "Approving DNZD…"
                    : step === "buying"
                    ? "Buying policy…"
                    : paymentPlan === "recurring"
                    ? "Subscribe (fortnightly)"
                    : "Buy Policy"}
                </button>
              </form>
            </div>

            {/* Right: Region Data */}
            <div className="lg:col-span-3">
              <div className="mb-3">
                <h2 className="text-lg font-bold text-ink-900">
                  {regionMeta.name}
                </h2>
                <p className="text-ink-500 text-sm">
                  Live seismic data for this region
                </p>
              </div>
              <RegionMiniGraph regionSlug={regionMeta.id} />
              <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6 mt-6">
                <h2 className="text-lg font-bold text-ink-900 mb-1">
                  {regionMeta.name} boundary
                </h2>
                <p className="text-ink-500 text-sm mb-4">
                  The highlighted area is the region's real boundary — exactly
                  what's used to decide whether a quake struck this region,
                  for policy payouts and investor returns alike.
                </p>
                <div className="rounded-lg overflow-hidden border border-ink-100">
                  <RegionMap
                    region={regionMeta}
                    markerLat={center.lat}
                    markerLng={center.lng}
                    markerLabel={regionMeta.name}
                  />
                </div>
              </div>
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
      <Suspense>
        <BuyPolicyForm />
      </Suspense>
    </div>
  );
}
