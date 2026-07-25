"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { useUserPolicies } from "@/lib/hooks/useQuakeShield";
import { useClaims } from "@/lib/hooks/useClaims";
import { useRenewPolicy } from "@/lib/hooks/useRenewPolicy";
import { getContracts } from "@/lib/contracts";
import { getExplorerUrl } from "@/lib/chains";
import { NZ_REGIONS } from "@quakeshield/shared";
import { SCALE, formatDNZD } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";

type Tab = "policies" | "claims";
type Filter = "all" | "active" | "paid";

function getMagnitudeLabel(magnitude: number): string {
  const labels: Record<number, string> = {
    0: "Micro", 1: "Micro", 2: "Micro", 3: "Minor", 4: "Light",
    5: "Moderate", 6: "Strong", 7: "Major", 8: "Great",
  };
  return labels[Math.floor(magnitude)] || "Great";
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) * 1000;
  return new Date(ms).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeLeft(periodEnd: bigint): string {
  const msLeft = Number(periodEnd) * 1000 - Date.now();
  if (msLeft <= 0) return "expired";
  const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}d left`;
  const hours = Math.max(1, Math.floor(msLeft / (60 * 60 * 1000)));
  return `${hours}h left`;
}

/** Renew button for a single recurring policy — pays the next 14-day premium. */
function RenewButton({
  policyId,
  coverageAmount,
  onRenewed,
}: {
  policyId: bigint;
  coverageAmount: bigint;
  onRenewed: () => void;
}) {
  const { renewPolicy, step, error, isPending, reset } = useRenewPolicy();

  if (step === "done") {
    return <span className="text-xs font-medium text-shield-700">Renewed ✓</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          renewPolicy(policyId, coverageAmount)
            .then(() => onRenewed())
            .catch(() => {});
        }}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-shield-600 text-white hover:bg-shield-700 transition-colors disabled:opacity-50"
      >
        {step === "approving" ? "Approving…" : step === "renewing" ? "Renewing…" : "Renew"}
      </button>
      {error && (
        <button
          type="button"
          onClick={reset}
          className="text-xs text-quake-700 max-w-[16rem] text-right"
        >
          {error}
        </button>
      )}
    </div>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "paid", label: "Paid Out" },
];

export default function PoliciesPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS } = getContracts(chainId);
  const explorerUrl = getExplorerUrl(chainId);
  const { policies, isLoading, refetch } = useUserPolicies();
  const { claims, isLoading: claimsLoading, error: claimsError } = useClaims();
  const [tab, setTab] = useState<Tab>("policies");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = policies.filter((p) => {
    if (filter === "active") return p.isActive && !p.hasPaidOut;
    if (filter === "paid") return p.hasPaidOut;
    return true;
  });

  const activeCount = policies.filter((p) => p.isActive && !p.hasPaidOut).length;
  const paidCount = policies.filter((p) => p.hasPaidOut).length;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "policies", label: "My Policies", count: policies.length },
    { key: "claims", label: "Claims", count: claims.length },
  ];

  return (
    <div className="min-h-screen bg-ink-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-ink-900">Policies &amp; Claims</h1>
          <Link
            href="/policies/new"
            className="bg-shield-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-shield-700 transition-colors text-sm"
          >
            + Buy Policy
          </Link>
        </div>

        {!isConnected ? (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center">
            <div className="w-16 h-16 bg-shield-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-ink-900 mb-2">Connect Your Wallet</h2>
            <p className="text-ink-600 mb-6">
              Connect your wallet to view your earthquake insurance policies and payouts.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            {/* Section Tabs */}
            <div className="flex gap-6 border-b border-ink-200 mb-6">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`-mb-px px-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                    tab === t.key
                      ? "border-shield-600 text-shield-700"
                      : "border-transparent text-ink-500 hover:text-ink-900"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs text-ink-400">{t.count}</span>
                </button>
              ))}
            </div>

            {tab === "policies" ? (
              <>
                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6">
                  {FILTERS.map((f) => {
                    const count = f.key === "all" ? policies.length : f.key === "active" ? activeCount : paidCount;
                    return (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === f.key
                            ? "bg-shield-600 text-white"
                            : "bg-white text-ink-600 border border-ink-200 hover:bg-ink-50"
                        }`}
                      >
                        {f.label}
                        <span className={`ml-1.5 text-xs ${filter === f.key ? "text-shield-200" : "text-ink-400"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Policy List */}
                <div className="bg-white rounded-xl shadow-sm border border-ink-100">
                  {isLoading ? (
                    <div className="divide-y divide-ink-100">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-5 flex items-start gap-4">
                          <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3.5 w-2/3" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-ink-500">
                      {policies.length === 0 ? (
                        <>
                          <svg className="w-12 h-12 mx-auto mb-4 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <p className="text-lg font-medium text-ink-900 mb-1">No policies yet</p>
                          <p className="mb-4">Buy your first policy to get covered against earthquakes.</p>
                          <Link
                            href="/policies/new"
                            className="inline-block bg-shield-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-shield-700 transition-colors"
                          >
                            Buy a Policy
                          </Link>
                        </>
                      ) : (
                        <p>No policies match the selected filter.</p>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-ink-100">
                      {filtered.map((policy) => {
                        const magnitude = SCALE.fromMagnitude(policy.triggerMagnitude);
                        const coverage = formatDNZD(policy.coverageAmount);
                        const premium = formatDNZD(policy.premiumPaid);
                        const regionName =
                          NZ_REGIONS[Number(policy.regionId)]?.name ?? "Unknown region";
                        const status = policy.hasPaidOut
                          ? "paid"
                          : policy.isActive
                            ? "active"
                            : "inactive";
                        const isExpired =
                          policy.periodEnd > 0n &&
                          Number(policy.periodEnd) * 1000 < Date.now();
                        const showRenew =
                          policy.isRecurring && status === "active" && !isExpired;

                        return (
                          <div key={policy.id.toString()} className="p-5">
                            <div className="flex items-start gap-4">
                              {/* Magnitude Badge */}
                              <div
                                className={`w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 ${
                                  status === "paid"
                                    ? "bg-shield-100 text-shield-700"
                                    : status === "active"
                                      ? "bg-quake-100 text-quake-700"
                                      : "bg-ink-100 text-ink-500"
                                }`}
                              >
                                M{magnitude.toFixed(1)}
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-ink-900">
                                    {getMagnitudeLabel(magnitude)} Earthquake Cover
                                  </p>
                                  <span
                                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                      status === "paid"
                                        ? "bg-shield-100 text-shield-700"
                                        : status === "active"
                                          ? "bg-quake-100 text-quake-700"
                                          : "bg-ink-100 text-ink-500"
                                    }`}
                                  >
                                    {status === "paid" ? "Paid Out" : status === "active" ? "Active" : "Inactive"}
                                  </span>
                                  {status !== "paid" && (
                                    <span
                                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                        isExpired
                                          ? "bg-quake-100 text-quake-700"
                                          : "bg-ink-100 text-ink-500"
                                      }`}
                                    >
                                      {policy.isRecurring ? "Fortnightly" : "One-off"} ·{" "}
                                      {formatTimeLeft(policy.periodEnd)}
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm text-ink-500">
                                  <span>
                                    Coverage: <strong className="text-ink-700">{coverage} DNZD</strong>
                                  </span>
                                  <span>
                                    Premium: <strong className="text-ink-700">{premium} DNZD</strong>
                                  </span>
                                  <span>
                                    Region: <strong className="text-ink-700">{regionName}</strong>
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 mt-2 text-xs text-ink-400">
                                  <span>Policy #{policy.id.toString()}</span>
                                  <span>Purchased {formatDate(policy.createdAt)}</span>
                                  {explorerUrl && QUAKESHIELD_ADDRESS && (
                                    <a
                                      href={`${explorerUrl}/address/${QUAKESHIELD_ADDRESS}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-shield-600 hover:text-shield-700 font-medium"
                                    >
                                      View on explorer →
                                    </a>
                                  )}
                                </div>
                              </div>

                              {showRenew && (
                                <RenewButton
                                  policyId={policy.id}
                                  coverageAmount={policy.coverageAmount}
                                  onRenewed={refetch}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Claims List */
              <div className="bg-white rounded-xl shadow-sm border border-ink-100">
                <div className="p-6 border-b border-ink-100">
                  <h2 className="text-xl font-semibold text-ink-900">Your Payouts</h2>
                  <p className="text-sm text-ink-500 mt-1">
                    Automatic payouts from triggered policies
                  </p>
                </div>

                {claimsLoading ? (
                  <div className="divide-y divide-ink-100">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 flex items-center gap-4">
                        <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-3.5 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : claimsError ? (
                  <p className="p-8 text-center text-quake-700">{claimsError}</p>
                ) : claims.length === 0 ? (
                  <div className="p-8 text-center text-ink-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-lg font-medium text-ink-900 mb-1">No claims yet</p>
                    <p className="text-ink-500 mb-4">
                      When an earthquake triggers your policy, the payout appears here.
                    </p>
                    <Link
                      href="/policies/new"
                      className="inline-block bg-shield-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-shield-700 transition-colors"
                    >
                      Buy Your First Policy
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-ink-100">
                    {claims.map((claim) => {
                      const magnitude = SCALE.fromMagnitude(claim.quakeMagnitude);
                      return (
                        <div key={claim.transactionHash} className="p-4 flex items-center gap-4">
                          <div className="w-14 h-14 rounded-lg bg-shield-100 text-shield-700 flex items-center justify-center font-bold text-lg shrink-0">
                            M{magnitude.toFixed(1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-ink-900 truncate">
                              {formatDNZD(claim.amount)} DNZD paid out
                            </p>
                            <p className="text-sm text-ink-500">
                              {getMagnitudeLabel(magnitude)} quake · Policy #{claim.policyId.toString()} · Block{" "}
                              {claim.blockNumber.toString()}
                            </p>
                          </div>
                          {explorerUrl && (
                            <a
                              href={`${explorerUrl}/tx/${claim.transactionHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-shield-600 hover:text-shield-700 shrink-0"
                            >
                              View tx →
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
