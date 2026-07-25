"use client";

import Link from "next/link";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { Header } from "@/components/layout/Header";
import { MARKET_CONTRACTS_CONFIGURED } from "@/lib/contracts";
import { useMarkets } from "@/lib/hooks/useMarkets";
import { SCALE } from "@/types";

export default function MarketsPage() {
  const { markets, isLoading } = useMarkets();

  return (
    <div className="min-h-screen bg-ink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-ink-900 mb-2">Earthquake Prediction Markets</h1>
        <p className="text-ink-600 mb-8">Bet on earthquake events. Buy YES or NO shares priced by a CPMM.</p>

        {!MARKET_CONTRACTS_CONFIGURED && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-8 text-sm">
            Contracts aren&rsquo;t deployed yet — set <code>NEXT_PUBLIC_EARTHQUAKE_MARKET_ADDRESS</code> in{" "}
            <code>apps/web/.env.local</code> to see live markets.
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-ink-500 py-12">Loading markets…</p>
        ) : markets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-12 text-center">
            <div className="w-16 h-16 bg-quake-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-quake-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-ink-900 mb-2">No markets yet</h2>
            <p className="text-ink-500">Markets will appear here once created by the admin.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => (
              <MarketCard key={market.id.toString()} market={market} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function MarketCard({ market }: { market: ReturnType<typeof useMarkets>["markets"][number] }) {
  const magnitude = SCALE.fromMagnitude(market.triggerMagnitude);
  const yesPercent = Math.round(market.yesProbability * 100);
  const noPercent = Math.round(market.noProbability * 100);
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Number(market.resolutionTime) - now;
  const isExpired = timeLeft <= 0;

  let statusLabel: string;
  let statusColor: string;
  if (market.resolved) {
    statusLabel = market.outcomeYes ? "Resolved YES" : "Resolved NO";
    statusColor = "bg-shield-100 text-shield-700";
  } else if (isExpired) {
    statusLabel = "Awaiting resolution";
    statusColor = "bg-quake-100 text-quake-700";
  } else {
    const days = Math.floor(timeLeft / 86400);
    statusLabel = days > 0 ? `${days}d left` : `${Math.floor(timeLeft / 3600)}h left`;
    statusColor = "bg-ink-100 text-ink-600";
  }

  return (
    <Link
      href={`/markets/${market.id.toString()}`}
      className="bg-white rounded-xl shadow-sm border border-ink-100 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-lg bg-quake-100 text-quake-700 flex items-center justify-center font-bold text-sm">
          M{magnitude.toFixed(1)}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
      <h3 className="font-semibold text-ink-900 mb-1 line-clamp-2">{market.description}</h3>
      <p className="text-sm text-ink-500 mb-4">
        {market.radiusKm.toString()}km radius
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-ink-500 mb-1">
            <span>YES</span>
            <span>{yesPercent}%</span>
          </div>
          <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-shield-500 rounded-full" style={{ width: `${yesPercent}%` }} />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-ink-500 mb-1">
            <span>NO</span>
            <span>{noPercent}%</span>
          </div>
          <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-quake-500 rounded-full" style={{ width: `${noPercent}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
