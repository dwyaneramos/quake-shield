"use client";

import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
function getMagnitudeLabel(magnitude: number): string {
  const labels: Record<number, string> = {
    0: "Micro",
    1: "Micro",
    2: "Micro",
    3: "Minor",
    4: "Light",
    5: "Moderate",
    6: "Strong",
    7: "Major",
    8: "Great",
  };
  return labels[Math.floor(magnitude)] || "Great";
}
import { ConnectButton } from "@/components/web3/ConnectButton";
import { Header } from "@/components/layout/Header";
import { isChainConfigured } from "@/lib/contracts";
import { usePoolStats, useUserPolicies } from "@/lib/hooks/useQuakeShield";
import { SCALE } from "@/types";
import HomeClient from "@/components/landing/HomeClient";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chainConfigured = isChainConfigured(chainId);
  const { stats, isLoading: statsLoading } = usePoolStats();
  const { policies, isLoading: policiesLoading } = useUserPolicies();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Seismic Graph + City Widgets */}
        <HomeClient />

        {/* Wallet Section */}
        <div className="mt-12 max-w-5xl mx-auto">
          {!chainConfigured && (
            <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm">
              QuakeShield isn&rsquo;t deployed on this network yet — switch
              networks in your wallet, or set the contract addresses for it in
              the root <code>.env</code> to see live data.
            </div>
          )}

          {!isConnected ? (
            <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center">
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
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-ink-900 mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-ink-600 mb-6">
                Connect your wallet to view policies, buy coverage, and track
                payouts.
              </p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          ) : (
            <>
              {/* Your Policies */}
              <div className="bg-white rounded-xl shadow-sm border border-ink-100 mb-6">
                <div className="p-6 border-b border-ink-100 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-ink-900">
                    Your Policies
                  </h2>
                  <Link
                    href="/policies/new"
                    className="text-sm font-semibold text-shield-600 hover:text-shield-700"
                  >
                    + Buy Policy
                  </Link>
                </div>
                {policiesLoading ? (
                  <p className="p-8 text-center text-ink-500">
                    Loading policies…
                  </p>
                ) : policies.length === 0 ? (
                  <div className="p-8 text-center text-ink-500">
                    <p className="text-lg font-medium text-ink-900 mb-1">
                      No policies yet
                    </p>
                    <p className="mb-4">
                      Buy your first policy to get covered.
                    </p>
                    <Link
                      href="/policies/new"
                      className="inline-block bg-shield-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-shield-700 transition-colors"
                    >
                      Buy a Policy
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-ink-100">
                    {policies.map((policy) => {
                      const magnitude = SCALE.fromMagnitude(
                        policy.triggerMagnitude,
                      );
                      return (
                        <div
                          key={policy.id.toString()}
                          className="p-4 flex items-center gap-4"
                        >
                          <div className="w-14 h-14 rounded-lg bg-shield-100 text-shield-700 flex items-center justify-center font-bold text-lg">
                            M{magnitude.toFixed(1)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-ink-900">
                              {getMagnitudeLabel(magnitude)} quake trigger ·{" "}
                              {policy.radiusKm.toString()}km radius
                            </p>
                            <p className="text-sm text-ink-500">
                              Coverage{" "}
                              {SCALE.fromUSDC(
                                policy.coverageAmount,
                              ).toLocaleString()}{" "}
                              USDC · Premium{" "}
                              {SCALE.fromUSDC(
                                policy.premiumPaid,
                              ).toLocaleString()}{" "}
                              USDC
                            </p>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              policy.hasPaidOut
                                ? "bg-shield-100 text-shield-700"
                                : policy.isActive
                                ? "bg-quake-100 text-quake-700"
                                : "bg-ink-100 text-ink-500"
                            }`}
                          >
                            {policy.hasPaidOut
                              ? "Paid out"
                              : policy.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </>
          )}

          {/* Pool Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6 mt-6">
            <h2 className="text-xl font-semibold text-ink-900 mb-4">
              Insurance Pool
            </h2>
            <div className="grid md:grid-cols-5 gap-6">
              <StatCard
                label="Pool Balance"
                value={
                  stats
                    ? `${SCALE.fromUSDC(stats.balance).toLocaleString()} USDC`
                    : "--"
                }
              />
              <StatCard
                label="Active Coverage"
                value={
                  stats
                    ? `${SCALE.fromUSDC(stats.totalActiveCoverage).toLocaleString()} USDC`
                    : "--"
                }
              />
              <StatCard
                label="Active Policies"
                value={stats ? stats.activePolicies.toString() : "--"}
              />
              <StatCard
                label="Total Premiums"
                value={
                  stats
                    ? `${SCALE.fromUSDC(stats.totalPremiums).toLocaleString()} USDC`
                    : "--"
                }
              />
              <StatCard
                label="Total Payouts"
                value={
                  stats
                    ? `${SCALE.fromUSDC(stats.totalPayouts).toLocaleString()} USDC`
                    : "--"
                }
              />
            </div>
            {stats && stats.totalActiveCoverage > 0n && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-ink-600 mb-1">
                  <span>Reserve Ratio</span>
                  <span>
                    {((Number(stats.balance) / Number(stats.totalActiveCoverage)) * 100).toFixed(0)}%
                    <span className="text-ink-400 ml-1">(min 150%)</span>
                  </span>
                </div>
                <div className="w-full bg-ink-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      Number(stats.balance) / Number(stats.totalActiveCoverage) < 1.5
                        ? "bg-red-500"
                        : Number(stats.balance) / Number(stats.totalActiveCoverage) < 2
                          ? "bg-yellow-500"
                          : "bg-shield-500"
                    }`}
                    style={{
                      width: `${Math.min((Number(stats.balance) / Number(stats.totalActiveCoverage)) * 100 / 3, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {!chainConfigured && (
              <p className="mt-4 text-sm text-ink-500">
                Deploy the contracts to see live stats here.
              </p>
            )}
            {chainConfigured && statsLoading && (
              <p className="mt-4 text-sm text-ink-500">
                Loading pool stats…
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-4 gap-6 mt-6">
            <QuickAction
              href="/policies/new"
              title="Buy Policy"
              description="Get earthquake coverage with custom triggers"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            />
            <QuickAction
              href="/providers"
              title="Capital Providers"
              description="Deposit USDC and earn yield from premiums"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <QuickAction
              href="/quakes"
              title="Live Quakes"
              description="Monitor real-time GeoNet earthquake data"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <QuickAction
              href="/claims"
              title="Claims History"
              description="View your past payouts and policy events"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-4 bg-ink-50 rounded-lg">
      <div className="text-2xl font-bold text-ink-900">{value}</div>
      <div className="text-sm text-ink-600 mt-1">{label}</div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl shadow-sm border border-ink-100 p-6 hover:shadow-md transition-shadow"
    >
      <div className="w-12 h-12 bg-shield-100 text-shield-600 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-ink-900 mb-1">{title}</h3>
      <p className="text-sm text-ink-600">{description}</p>
    </Link>
  );
}
