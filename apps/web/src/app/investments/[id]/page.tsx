"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { isChainConfigured } from "@/lib/contracts";
import { getExplorerUrl } from "@/lib/chains";
import {
  useRegion,
  useMyRegionPosition,
  useDNZDBalance,
  usePreviewAccrual,
  useInvest,
  useWithdrawInvestment,
  useAccrueRegion,
} from "@/lib/hooks/useInvestments";
import { NZ_REGIONS } from "@quakeshield/shared";
import { SCALE, formatDNZD } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";

const RegionActivityChart = dynamic(
  () => import("@/components/investments/RegionActivityChart").then((mod) => mod.RegionActivityChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);

interface TrendPoint {
  time: string;
  quakeCount: number;
  maxMagnitude: number;
}

interface RegionActivity {
  quakeCount: number;
  maxMagnitude: number;
  estimatedRiskScoreBps: number;
  trend: TrendPoint[];
}

function useRegionActivity(regionSlug: string | undefined) {
  const [data, setData] = useState<RegionActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!regionSlug) return;
    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/geonet/regions?region=${regionSlug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json && !json.error) setData(json.regions as RegionActivity);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [regionSlug]);

  return { activity: data, isLoading };
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "due now";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function RegionInvestmentPage() {
  const params = useParams<{ id: string }>();
  const regionId = Number(params.id);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfigured = isChainConfigured(chainId);

  const { region, isLoading: regionLoading, refetch: refetchRegion } = useRegion(regionId);
  const meta = NZ_REGIONS[regionId];
  const { activity, isLoading: activityLoading } = useRegionActivity(meta?.id);

  const { position, isLoading: positionLoading, refetch: refetchPosition } =
    useMyRegionPosition(regionId);
  const { balance: walletBalance, refetch: refetchBalance } = useDNZDBalance();
  const { pendingInterest, periodsDue } = usePreviewAccrual(regionId);

  const { invest, step: investStep, error: investError, isPending: investPending, txHash: investTxHash, reset: resetInvest } = useInvest();
  const { withdraw, step: withdrawStep, error: withdrawError, isPending: withdrawPending, txHash: withdrawTxHash, reset: resetWithdraw } = useWithdrawInvestment();
  const { accrue, isPending: accruePending } = useAccrueRegion();

  const [investAmount, setInvestAmount] = useState("500");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const i = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(i);
  }, []);

  const refetchAll = async () => {
    await Promise.all([refetchRegion(), refetchPosition(), refetchBalance()]);
  };

  const handleInvest = async () => {
    const amountNum = Number(investAmount) || 0;
    if (amountNum <= 0) return;
    await invest(regionId, SCALE.toDNZD(amountNum))
      .then(() => refetchAll())
      .catch(() => {});
  };

  const handleWithdraw = async (amount: bigint) => {
    if (amount <= 0n) return;
    await withdraw(regionId, amount)
      .then(() => refetchAll())
      .catch(() => {});
  };

  if (!Number.isInteger(regionId) || regionId < 0) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-3xl mx-auto px-4 py-16 text-center text-ink-500">
          Unknown region.
        </main>
      </div>
    );
  }

  const nextAccrualAt = region ? Number(region.lastAccrualAt) + 14 * 86400 : 0;
  const secondsUntilAccrual = nextAccrualAt - nowSec;

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/investments" className="text-sm font-semibold text-shield-600 hover:text-shield-700">
          ← All regions
        </Link>

        <div className="flex items-center justify-between gap-4 mt-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink-900">
              {regionLoading ? <Skeleton className="h-8 w-48" /> : region?.name ?? meta?.name}
            </h1>
            <p className="text-ink-500 mt-1">{meta?.island}</p>
          </div>
          {region && (
            <div className="text-right">
              <div className="text-3xl font-black text-shield-600">
                {SCALE.fromBps(region.aprBps).toFixed(1)}%
              </div>
              <div className="text-sm text-ink-500">current APR</div>
            </div>
          )}
        </div>

        {!chainConfigured && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm">
            QuakeShield isn&rsquo;t deployed on this network yet.
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {/* Region stats */}
            <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
              <h2 className="text-lg font-bold text-ink-900 mb-4">Region Stats</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat
                  label="Invested"
                  value={region ? `${formatDNZD(region.totalAssets)} DNZD` : "--"}
                  isLoading={regionLoading}
                />
                <Stat
                  label="Quakes recorded"
                  value={region ? region.quakeCount.toString() : "--"}
                  isLoading={regionLoading}
                />
                <Stat
                  label="Interest paid"
                  value={region ? `${formatDNZD(region.totalInterestPaid)} DNZD` : "--"}
                  isLoading={regionLoading}
                />
                <Stat
                  label="Losses paid"
                  value={region ? `${formatDNZD(region.totalLosses)} DNZD` : "--"}
                  isLoading={regionLoading}
                />
              </div>
              {region && (
                <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-sm">
                  <span className="text-ink-500">Next fortnightly settlement</span>
                  <span className="font-medium text-ink-900">
                    {region.lastQuakeAt > 0n && Number(region.lastQuakeAt) > nextAccrualAt - 14 * 86400
                      ? "Interrupted by a recent quake"
                      : formatCountdown(secondsUntilAccrual)}
                  </span>
                </div>
              )}
            </div>

            {/* Recent seismic activity */}
            <div className="bg-white rounded-xl shadow-sm border border-ink-100 overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <p className="text-ink-500 text-xs font-medium uppercase tracking-wider">
                  90-Day Seismic Activity (M4+)
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  {activityLoading ? (
                    <Skeleton className="h-9 w-16" />
                  ) : (
                    <span className="text-4xl font-black tabular-nums text-shield-600">
                      {activity?.quakeCount ?? 0}
                    </span>
                  )}
                  <span className="text-ink-500 text-sm">quakes nearby</span>
                </div>
                <p className="text-xs text-ink-400 mt-1">
                  This is what the oracle&rsquo;s risk score — and this region&rsquo;s APR — is derived from.
                </p>
              </div>
              <div className="px-2 pb-2 h-[160px]">
                <RegionActivityChart trend={activity?.trend ?? []} />
              </div>
            </div>

            {/* Preview accrual + manual trigger */}
            {region && region.totalAssets > 0n && (
              <div className="bg-ink-50 rounded-xl p-4 border border-ink-100 flex items-center justify-between">
                <div className="text-sm">
                  <p className="text-ink-700 font-medium">
                    {periodsDue > 0n
                      ? `${periodsDue.toString()} fortnight(s) ready to settle`
                      : "No settlement due yet"}
                  </p>
                  {periodsDue > 0n && (
                    <p className="text-ink-500">
                      Would credit ~{formatDNZD(pendingInterest)} DNZD to the region
                    </p>
                  )}
                </div>
                {periodsDue > 0n && (
                  <button
                    onClick={() => accrue(regionId).then(refetchAll).catch(() => {})}
                    disabled={accruePending}
                    className="bg-ink-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-ink-800 transition-colors disabled:opacity-50"
                  >
                    {accruePending ? "Settling…" : "Settle now"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!isConnected ? (
              <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center">
                <h2 className="text-lg font-semibold text-ink-900 mb-2">Connect your wallet</h2>
                <p className="text-ink-600 text-sm mb-6">Connect to invest in {region?.name ?? meta?.name}.</p>
                <ConnectButton />
              </div>
            ) : (
              <>
                {/* My position */}
                <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
                  <h2 className="text-lg font-bold text-ink-900 mb-4">Your Position</h2>
                  <div className="flex justify-between items-center gap-2 p-4 bg-ink-50 rounded-lg mb-3 min-w-0">
                    <span className="text-ink-600 text-sm shrink-0">Current value</span>
                    {positionLoading ? (
                      <Skeleton className="h-5 w-20" />
                    ) : (
                      <span className="font-bold text-ink-900 truncate" title={position ? `${formatDNZD(position.value)} DNZD` : undefined}>
                        {position ? `${formatDNZD(position.value)} DNZD` : "0 DNZD"}
                      </span>
                    )}
                  </div>

                  {position && position.value > 0n && (
                    withdrawStep === "done" ? (
                      <div className="text-center p-4 bg-shield-50 rounded-lg">
                        <p className="font-medium text-shield-700 mb-2">Withdrawal successful!</p>
                        {withdrawTxHash && (
                          <a
                            href={`${getExplorerUrl(chainId)}/tx/${withdrawTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-shield-600 hover:text-shield-700"
                          >
                            View transaction →
                          </a>
                        )}
                        <button onClick={resetWithdraw} className="mt-2 text-sm text-ink-500 hover:text-ink-700 block mx-auto">
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="Amount"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="flex-1 border border-ink-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                          />
                          <button
                            type="button"
                            onClick={() => setWithdrawAmount(SCALE.fromDNZD(position.value).toString())}
                            className="text-xs font-medium text-shield-600 hover:text-shield-700 shrink-0"
                          >
                            Max
                          </button>
                        </div>
                        <button
                          onClick={() => handleWithdraw(SCALE.toDNZD(Number(withdrawAmount) || 0))}
                          disabled={withdrawPending || (Number(withdrawAmount) || 0) <= 0}
                          className="w-full bg-ink-900 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-ink-800 transition-colors disabled:opacity-50"
                        >
                          {withdrawStep === "withdrawing" ? "Withdrawing…" : "Withdraw"}
                        </button>
                        {withdrawError && <p className="text-xs text-quake-700">{withdrawError}</p>}
                      </div>
                    )
                  )}
                </div>

                {/* Invest form */}
                <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
                  <h2 className="text-lg font-bold text-ink-900 mb-1">Invest</h2>
                  <p className="text-ink-500 text-sm mb-4 truncate" title={`Wallet balance: ${formatDNZD(walletBalance)} DNZD`}>
                    Wallet balance: {formatDNZD(walletBalance)} DNZD
                  </p>

                  {investStep === "done" ? (
                    <div className="text-center p-4 bg-shield-50 rounded-lg">
                      <p className="font-medium text-shield-700 mb-2">Investment placed!</p>
                      {investTxHash && (
                        <a
                          href={`${getExplorerUrl(chainId)}/tx/${investTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-shield-600 hover:text-shield-700"
                        >
                          View transaction →
                        </a>
                      )}
                      <button onClick={resetInvest} className="mt-2 text-sm text-ink-500 hover:text-ink-700 block mx-auto">
                        Invest more
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="number"
                        min={0}
                        value={investAmount}
                        onChange={(e) => setInvestAmount(e.target.value)}
                        className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                      />
                      <div className="bg-ink-50 rounded-lg p-3 border border-ink-100 text-sm flex justify-between">
                        <span className="text-ink-500">Estimated annual return</span>
                        <span className="font-semibold text-shield-700">
                          {region
                            ? `${((Number(investAmount) || 0) * SCALE.fromBps(region.aprBps) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} DNZD`
                            : "--"}
                        </span>
                      </div>
                      {investError && <p className="text-xs text-quake-700">{investError}</p>}
                      <button
                        onClick={handleInvest}
                        disabled={investPending || (Number(investAmount) || 0) <= 0 || !chainConfigured}
                        className="w-full bg-shield-600 text-white py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors disabled:opacity-50"
                      >
                        {investStep === "approving"
                          ? "Approving DNZD…"
                          : investStep === "investing"
                          ? "Investing…"
                          : `Invest in ${region?.name ?? meta?.name ?? "region"}`}
                      </button>
                      <p className="text-xs text-ink-400">
                        Principal isn&rsquo;t guaranteed — if a significant quake strikes this
                        region, payouts are charged against invested capital here first.
                      </p>
                    </div>
                  )}
                </div>
            </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, isLoading }: { label: string; value: string; isLoading?: boolean }) {
  return (
    <div className="min-w-0">
      {isLoading ? <Skeleton className="h-6 w-16 mb-1" /> : <div className="text-lg font-bold text-ink-900 truncate" title={value}>{value}</div>}
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}
