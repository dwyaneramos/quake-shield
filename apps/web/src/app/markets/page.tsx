"use client";

import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { Header } from "@/components/layout/Header";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { getContracts } from "@/lib/contracts";
import { useMarkets } from "@/lib/hooks/useMarkets";
import { SCALE } from "@/types";

function timeUntil(resolutionTime: bigint): string {
  const now = Date.now() / 1000;
  const diff = Number(resolutionTime) - now;
  if (diff <= 0) return "Resolution due";

  const days = Math.floor(diff / 86400);
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / 3600);
  if (hours > 0) return `${hours}h left`;
  return `${Math.max(1, Math.floor(diff / 60))}m left`;
}

export default function MarketsPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { EARTHQUAKE_MARKET_ADDRESS } = getContracts(chainId);
  const marketsConfigured = Boolean(EARTHQUAKE_MARKET_ADDRESS);
  const { markets, isLoading } = useMarkets();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-ink-900 mb-2">Earthquake Markets</h1>
        <p className="text-ink-600 mb-8">
          Trade YES/NO on real earthquake events, resolved automatically from GeoNet data.
        </p>

        {!marketsConfigured && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm">
            EarthquakeMarket isn&rsquo;t deployed on this network yet — switch
            networks in your wallet, or set the contract addresses for it in
            the root <code>.env</code> to see live markets.
          </div>
        )}

        {!isConnected ? (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-shield-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-ink-900 mb-2">Connect Your Wallet</h2>
            <p className="text-ink-600 mb-6">Connect your wallet to trade on earthquake prediction markets.</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : isLoading ? (
          <p className="text-center text-ink-500 py-12">Loading markets…</p>
        ) : markets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center text-ink-500">
            <p className="text-lg font-medium text-ink-900 mb-1">No markets yet</p>
            <p>Check back once markets are created for this network.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => {
              const yesPct = SCALE.fromOdds(market.yesPrice) * 100;
              const noPct = 100 - yesPct;
              const magnitude = SCALE.fromMagnitude(market.triggerMagnitude);

              return (
                <Link
                  key={market.id.toString()}
                  href={`/markets/${market.id.toString()}`}
                  className="bg-white rounded-xl shadow-sm border border-ink-100 p-6 hover:border-shield-300 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <h2 className="font-semibold text-ink-900 leading-snug">{market.description}</h2>
                    {market.resolved && (
                      <span
                        className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          market.outcomeYes ? "bg-shield-100 text-shield-700" : "bg-ink-100 text-ink-600"
                        }`}
                      >
                        {market.outcomeYes ? "Resolved YES" : "Resolved NO"}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-ink-500 mb-4">
                    M{magnitude.toFixed(1)}+ within {market.radiusKm.toString()}km
                  </p>

                  <div className="mb-2">
                    <div className="flex h-2 rounded-full overflow-hidden bg-ink-100">
                      <div className="bg-shield-500" style={{ width: `${yesPct}%` }} />
                      <div className="bg-quake-400" style={{ width: `${noPct}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-shield-700">YES {yesPct.toFixed(0)}%</span>
                    <span className="text-quake-700">NO {noPct.toFixed(0)}%</span>
                  </div>

                  {!market.resolved && (
                    <p className="text-xs text-ink-400 mt-3">{timeUntil(market.resolutionTime)}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
