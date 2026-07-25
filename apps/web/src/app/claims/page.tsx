"use client";

import Link from "next/link";
function getMagnitudeLabel(magnitude: number): string {
  const labels: Record<number, string> = { 0: "Micro", 1: "Micro", 2: "Micro", 3: "Minor", 4: "Light", 5: "Moderate", 6: "Strong", 7: "Major", 8: "Great" };
  return labels[Math.floor(magnitude)] || "Great";
}
import { ConnectButton } from "@/components/web3/ConnectButton";
import { Header } from "@/components/layout/Header";
import { useClaims } from "@/lib/hooks/useClaims";
import { POLYGON_AMOY } from "@/lib/polygon";
import { SCALE } from "@/types";

export default function ClaimsPage() {
  const { claims, isLoading, isConnected, error } = useClaims();

  return (
    <div className="min-h-screen bg-ink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-8">Claims History</h1>

        <div className="bg-white rounded-xl shadow-sm border border-ink-100">
          <div className="p-6 border-b border-ink-100">
            <h2 className="text-xl font-semibold text-ink-900">Your Payouts</h2>
            <p className="text-sm text-ink-500 mt-1">Automatic payouts from triggered policies</p>
          </div>

          {!isConnected ? (
            <div className="p-8 text-center text-ink-500">
              <p className="mb-4">Connect your wallet to see your claims history.</p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          ) : isLoading ? (
            <p className="p-8 text-center text-ink-500">Loading claims…</p>
          ) : error ? (
            <p className="p-8 text-center text-quake-700">{error}</p>
          ) : claims.length === 0 ? (
            <div className="p-8 text-center text-ink-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium text-ink-900 mb-1">No claims yet</p>
              <p className="text-ink-500 mb-4">When an earthquake triggers your policy, the payout appears here.</p>
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
                    <div className="w-14 h-14 rounded-lg bg-shield-100 text-shield-700 flex items-center justify-center font-bold text-lg">
                      M{magnitude.toFixed(1)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-ink-900">
                        {SCALE.fromUSDC(claim.amount).toLocaleString()} USDC paid out
                      </p>
                      <p className="text-sm text-ink-500">
                        {getMagnitudeLabel(magnitude)} quake · Policy #{claim.policyId.toString()} · Block{" "}
                        {claim.blockNumber.toString()}
                      </p>
                    </div>
                    <a
                      href={`${POLYGON_AMOY.blockExplorers.default.url}/tx/${claim.transactionHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-shield-600 hover:text-shield-700"
                    >
                      View tx →
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
