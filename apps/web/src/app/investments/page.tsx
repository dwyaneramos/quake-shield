"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { isChainConfigured } from "@/lib/contracts";
import { useRegions, useMyInvestments } from "@/lib/hooks/useInvestments";
import { usePoolStats } from "@/lib/hooks/useQuakeShield";
import { NZ_REGIONS } from "@quakeshield/shared";
import { SCALE } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";

function riskLabel(aprBps: bigint): { label: string; className: string } {
  const apr = Number(aprBps);
  if (apr <= 800) return { label: "Quiet", className: "bg-shield-100 text-shield-700" };
  if (apr <= 1600) return { label: "Moderate", className: "bg-quake-100 text-quake-700" };
  return { label: "Active", className: "bg-red-100 text-red-700" };
}

export default function InvestmentsPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfigured = isChainConfigured(chainId);
  const { regions, isLoading } = useRegions();
  const { stats } = usePoolStats();
  const { positions } = useMyInvestments();

  const positionByRegion = useMemo(
    () => new Map(positions.map((p) => [p.regionId, p])),
    [positions]
  );

  const sortedRegions = useMemo(
    () => [...regions].sort((a, b) => a.name.localeCompare(b.name)),
    [regions]
  );

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-ink-900 mb-2">Invest in a Region</h1>
          <p className="text-ink-600">
            Back a New Zealand region against earthquakes. If it stays quiet for a
            fortnight, you earn a return out of policyholder premiums. If a
            significant quake strikes it, the payouts it causes come out of the
            capital invested there first — so the riskier a region has been
            lately, the more it pays to back it.
          </p>
        </div>

        {!chainConfigured && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mt-6 text-sm">
            QuakeShield isn&rsquo;t deployed on this network yet — switch networks in
            your wallet, or set the contract addresses in the root <code>.env</code>{" "}
            to see live regions.
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4 mt-8 max-w-3xl">
          <div className="bg-ink-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-ink-900">
              {stats ? `${SCALE.fromDNZD(stats.totalInvested).toLocaleString()}` : "--"}
            </div>
            <div className="text-sm text-ink-500 mt-1">DNZD invested pool-wide</div>
          </div>
          <div className="bg-ink-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-ink-900">
              {stats ? `${SCALE.fromDNZD(stats.yieldReserve).toLocaleString()}` : "--"}
            </div>
            <div className="text-sm text-ink-500 mt-1">DNZD yield reserve</div>
          </div>
          <div className="bg-ink-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-ink-900">4% – 30%</div>
            <div className="text-sm text-ink-500 mt-1">Annualised return range</div>
          </div>
        </div>

        {!isConnected ? (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center max-w-xl mt-10">
            <h2 className="text-xl font-semibold text-ink-900 mb-2">
              Connect your wallet
            </h2>
            <p className="text-ink-600 mb-6">
              Connect to invest in a region and track your positions.
            </p>
            <ConnectButton />
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {isLoading && regions.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
                  <Skeleton className="h-5 w-1/2 mb-3" />
                  <Skeleton className="h-3.5 w-1/3 mb-4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            : sortedRegions.map((region) => {
                const meta = NZ_REGIONS[region.id];
                const risk = riskLabel(region.aprBps);
                const position = positionByRegion.get(region.id);

                return (
                  <Link
                    key={region.id}
                    href={`/investments/${region.id}`}
                    className="bg-white rounded-xl shadow-sm border border-ink-100 p-6 hover:border-shield-300 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <h2 className="font-semibold text-ink-900">{region.name}</h2>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${risk.className}`}>
                        {risk.label}
                      </span>
                    </div>
                    <p className="text-xs text-ink-400 mb-4">{meta?.island ?? ""}</p>

                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl font-black text-shield-600">
                        {SCALE.fromBps(region.aprBps).toFixed(1)}%
                      </span>
                      <span className="text-sm text-ink-500">APR</span>
                    </div>
                    <p className="text-xs text-ink-400 mb-4">
                      Paid fortnightly if no qualifying quake strikes
                    </p>

                    <div className="flex justify-between text-sm border-t border-ink-100 pt-3">
                      <span className="text-ink-500">
                        {SCALE.fromDNZD(region.totalAssets).toLocaleString()} DNZD invested
                      </span>
                      {position && (
                        <span className="font-semibold text-shield-700">
                          You: {SCALE.fromDNZD(position.value).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
        </div>

        {!isLoading && regions.length === 0 && chainConfigured && (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center text-ink-500 mt-8">
            <p className="text-lg font-medium text-ink-900 mb-1">No regions registered yet</p>
            <p>Regions are seeded when the contract is deployed — check back soon.</p>
          </div>
        )}
      </main>
    </div>
  );
}
