"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { Header } from "@/components/layout/Header";
import { CONTRACTS_CONFIGURED } from "@/lib/contracts";
import { useDeposit, useMyPosition, useWithdraw } from "@/lib/hooks/useCapitalProvider";
import { usePoolStats } from "@/lib/hooks/useQuakeShield";
import { POLYGON_AMOY } from "@/lib/polygon";
import { SCALE } from "@/types";

export default function ProvidersPage() {
  const { isConnected } = useAccount();
  const { stats } = usePoolStats();
  const { position } = useMyPosition();
  const { deposit, step: depositStep, error: depositError, txHash: depositTxHash, reset: resetDeposit } = useDeposit();
  const { withdraw, step: withdrawStep, error: withdrawError, txHash: withdrawTxHash, reset: resetWithdraw } = useWithdraw();

  const [depositAmount, setDepositAmount] = useState("1000");

  const depositNum = Number(depositAmount) || 0;

  const handleDeposit = async () => {
    if (depositNum <= 0) return;
    await deposit(SCALE.toUSDC(depositNum)).catch(() => {});
  };

  const handleWithdraw = async () => {
    await withdraw().catch(() => {});
  };

  const utilization = stats && stats.totalActiveCoverage > 0n
    ? Number((stats.balance * 10000n) / stats.totalActiveCoverage) / 100
    : null;

  const yieldEarned = position && position.shares > 0n && stats && stats.totalShares > 0n
    ? position.currentValue - (position.shares * stats.balance) / (stats.totalShares + position.shares)
    : 0n;

  return (
    <div className="min-h-screen bg-ink-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink-900">Capital Providers</h1>
            <p className="text-ink-600 mt-1">Deposit USDC to back the insurance pool and earn yield from premiums.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-semibold text-shield-600 hover:text-shield-700">
            ← Back to Dashboard
          </Link>
        </div>

        {!CONTRACTS_CONFIGURED && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm">
            Contracts aren&rsquo;t deployed yet. Set the contract addresses in{" "}
            <code>apps/web/.env.local</code> to enable deposits.
          </div>
        )}

        {/* Pool Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-ink-900 mb-4">Pool Overview</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <StatCard
              label="Pool Balance"
              value={stats ? `${SCALE.fromUSDC(stats.balance).toLocaleString()} USDC` : "--"}
            />
            <StatCard
              label="Active Coverage"
              value={stats ? `${SCALE.fromUSDC(stats.totalActiveCoverage).toLocaleString()} USDC` : "--"}
            />
            <StatCard
              label="Reserve Ratio"
              value={utilization !== null ? `${utilization.toFixed(0)}%` : "∞"}
            />
            <StatCard
              label="Total Shares"
              value={stats ? stats.totalShares.toLocaleString() : "0"}
            />
          </div>
          {utilization !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-ink-600 mb-1">
                <span>Utilization</span>
                <span>{utilization.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-ink-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    utilization > 120 ? "bg-red-500" : utilization > 80 ? "bg-yellow-500" : "bg-shield-500"
                  }`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
              <p className="text-xs text-ink-500 mt-1">
                {utilization < 150
                  ? "Pool has sufficient reserves to cover claims"
                  : "Warning: Pool reserves are below the 150% minimum — no new policies can be purchased"}
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Your Position */}
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
            <h2 className="text-xl font-semibold text-ink-900 mb-4">Your Position</h2>
            {!isConnected ? (
              <div className="text-center py-8">
                <ConnectButton />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-ink-50 rounded-lg">
                  <span className="text-ink-600">Your Shares</span>
                  <span className="font-bold text-ink-900">{position ? position.shares.toLocaleString() : "0"}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-ink-50 rounded-lg">
                  <span className="text-ink-600">Current Value</span>
                  <span className="font-bold text-ink-900">
                    {position ? `${SCALE.fromUSDC(position.currentValue).toLocaleString()} USDC` : "0 USDC"}
                  </span>
                </div>
                {position && position.shares > 0n && (
                  <div className="flex justify-between items-center p-4 bg-shield-50 rounded-lg">
                    <span className="text-shield-700">Pool Share</span>
                    <span className="font-bold text-shield-700">
                      {stats && stats.totalShares > 0n
                        ? `${((Number(position.shares) / Number(stats.totalShares)) * 100).toFixed(2)}%`
                        : "0%"}
                    </span>
                  </div>
                )}

                {/* Withdraw */}
                {position && position.shares > 0n && (
                  <div className="pt-4 border-t border-ink-100">
                    {withdrawStep === "done" ? (
                      <div className="text-center p-4 bg-shield-50 rounded-lg">
                        <p className="font-medium text-shield-700 mb-2">Withdrawal successful!</p>
                        {withdrawTxHash && (
                          <a
                            href={`${POLYGON_AMOY.blockExplorers.default.url}/tx/${withdrawTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-shield-600 hover:text-shield-700"
                          >
                            View on Polygonscan →
                          </a>
                        )}
                        <button onClick={resetWithdraw} className="mt-2 text-sm text-ink-500 hover:text-ink-700">
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleWithdraw}
                        disabled={withdrawStep === "withdrawing"}
                        className="w-full bg-ink-900 text-white py-3 rounded-lg font-semibold hover:bg-ink-800 transition-colors disabled:opacity-50"
                      >
                        {withdrawStep === "withdrawing" ? "Withdrawing…" : "Withdraw All"}
                      </button>
                    )}
                    {withdrawError && <p className="text-sm text-quake-700 mt-2">{withdrawError}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Deposit Form */}
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
            <h2 className="text-xl font-semibold text-ink-900 mb-4">Deposit USDC</h2>
            {!isConnected ? (
              <div className="text-center py-8">
                <ConnectButton />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-2">Amount (USDC)</label>
                  <input
                    type="number"
                    min={0}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
                  />
                </div>

                <div className="bg-ink-50 rounded-lg p-4 text-sm text-ink-600 space-y-1">
                  <p>Premiums from policyholders are distributed to providers proportionally.</p>
                  <p className="font-medium text-ink-700">Your pool share after deposit: </p>
                  {stats && stats.totalShares > 0n ? (
                    (() => {
                      const currentPoolValue = Number(stats.balance) / 1e6;
                      const newDepositValue = depositNum;
                      const sharePercent = (newDepositValue / (currentPoolValue + newDepositValue)) * 100;
                      return <p className="font-bold text-shield-700">~{sharePercent.toFixed(2)}%</p>;
                    })()
                  ) : (
                    <p className="font-bold text-shield-700">100% (first provider)</p>
                  )}
                </div>

                {depositStep === "done" ? (
                  <div className="text-center p-4 bg-shield-50 rounded-lg">
                    <p className="font-medium text-shield-700 mb-2">Deposit successful!</p>
                    {depositTxHash && (
                      <a
                        href={`${POLYGON_AMOY.blockExplorers.default.url}/tx/${depositTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-shield-600 hover:text-shield-700"
                      >
                        View on Polygonscan →
                      </a>
                    )}
                    <button onClick={resetDeposit} className="mt-2 text-sm text-ink-500 hover:text-ink-700">
                      Deposit More
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleDeposit}
                    disabled={depositNum <= 0 || depositStep === "approving" || depositStep === "depositing"}
                    className="w-full bg-shield-600 text-white py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {depositStep === "approving"
                      ? "Approving USDC…"
                      : depositStep === "depositing"
                        ? "Depositing…"
                        : "Deposit"}
                  </button>
                )}
                {depositError && <p className="text-sm text-quake-700 mt-2">{depositError}</p>}
              </div>
            )}
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
