"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { getMagnitudeLabel } from "@quakeshield/shared";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { Header } from "@/components/layout/Header";
import { CONTRACTS_CONFIGURED } from "@/lib/contracts";
import { usePoolStats, useUserPolicies } from "@/lib/hooks/useQuakeShield";
import { SCALE } from "@/types";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { stats, isLoading: statsLoading } = usePoolStats();
  const { policies, isLoading: policiesLoading } = useUserPolicies();

  return (
    <div className="min-h-screen bg-ink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-8">Dashboard</h1>

        {!CONTRACTS_CONFIGURED && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-8 text-sm">
            Contracts aren&rsquo;t deployed yet — set <code>NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS</code> and{" "}
            <code>NEXT_PUBLIC_MOCK_USDC_ADDRESS</code> in <code>apps/web/.env.local</code> to see live data.
          </div>
        )}

        {!isConnected ? (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-shield-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-ink-900 mb-2">Connect Your Wallet</h2>
            <p className="text-ink-600 mb-6">
              Connect your wallet to view policies, buy coverage, and track payouts.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 mb-8">
            <div className="p-6 border-b border-ink-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-ink-900">Your Policies</h2>
              <Link href="/policies/new" className="text-sm font-semibold text-shield-600 hover:text-shield-700">
                + Buy Policy
              </Link>
            </div>
            {policiesLoading ? (
              <p className="p-8 text-center text-ink-500">Loading policies…</p>
            ) : policies.length === 0 ? (
              <div className="p-8 text-center text-ink-500">
                <p className="text-lg font-medium text-ink-900 mb-1">No policies yet</p>
                <p className="mb-4">Buy your first policy to get covered.</p>
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
                  const magnitude = SCALE.fromMagnitude(policy.triggerMagnitude);
                  return (
                    <div key={policy.id.toString()} className="p-4 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-shield-100 text-shield-700 flex items-center justify-center font-bold text-lg">
                        M{magnitude.toFixed(1)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-ink-900">
                          {getMagnitudeLabel(magnitude)} quake trigger · {policy.radiusKm.toString()}km radius
                        </p>
                        <p className="text-sm text-ink-500">
                          Coverage {SCALE.fromUSDC(policy.coverageAmount).toLocaleString()} USDC · Premium{" "}
                          {SCALE.fromUSDC(policy.premiumPaid).toLocaleString()} USDC
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
                        {policy.hasPaidOut ? "Paid out" : policy.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
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

        {/* Pool Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
          <h2 className="text-xl font-semibold text-ink-900 mb-4">Insurance Pool Stats</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <StatCard
              label="Total Premiums"
              value={stats ? `${SCALE.fromUSDC(stats.totalPremiums).toLocaleString()} USDC` : "--"}
            />
            <StatCard
              label="Total Payouts"
              value={stats ? `${SCALE.fromUSDC(stats.totalPayouts).toLocaleString()} USDC` : "--"}
            />
            <StatCard label="Pool Balance" value={stats ? `${SCALE.fromUSDC(stats.balance).toLocaleString()} USDC` : "--"} />
            <StatCard label="Active Policies" value={stats ? stats.activePolicies.toString() : "--"} />
          </div>
          {!CONTRACTS_CONFIGURED && (
            <p className="mt-4 text-sm text-ink-500">Deploy the contracts to see live stats here.</p>
          )}
          {CONTRACTS_CONFIGURED && statsLoading && <p className="mt-4 text-sm text-ink-500">Loading pool stats…</p>}
        </div>
      </main>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-4 bg-ink-50 rounded-lg">
      <div className="text-2xl font-bold text-ink-900">{value}</div>
      <div className="text-sm text-ink-600 mt-1">{label}</div>
    </div>
  );
}
