"use client";

import { useState } from "react";
import Link from "next/link";
import { useChainId } from "wagmi";
import { getContracts } from "@/lib/contracts";
import { getExplorerUrl } from "@/lib/chains";
import { useMarkets } from "@/lib/hooks/useMarkets";
import { useBuyShares } from "@/lib/hooks/useBuyShares";
import { SCALE } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";

function timeUntil(resolutionTime: bigint): string {
  const diff = Number(resolutionTime) - Date.now() / 1000;
  if (diff <= 0) return "Resolution due";
  const days = Math.floor(diff / 86400);
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / 3600);
  if (hours > 0) return `${hours}h left`;
  return `${Math.max(1, Math.floor(diff / 60))}m left`;
}

/** Inline buy widget for a single market card — a one-off YES/NO trade,
 * distinct from a policy purchase which recurs. */
function MarketBuyCard({ market, onTraded }: { market: ReturnType<typeof useMarkets>["markets"][number]; onTraded: () => void }) {
  const chainId = useChainId();
  const { buyShares, step, error, isPending, buyTxHash, reset } = useBuyShares();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("10");

  const yesPct = SCALE.fromOdds(market.yesPrice) * 100;
  const noPct = 100 - yesPct;
  const magnitude = SCALE.fromMagnitude(market.triggerMagnitude);
  const amountIn = SCALE.toDNZD(Number(amount) || 0);
  const marketClosed = market.resolved || Date.now() / 1000 >= Number(market.resolutionTime);

  const handleBuy = async () => {
    if (amountIn <= 0n) return;
    await buyShares(market.id, side === "yes", amountIn)
      .then(onTraded)
      .catch(() => {});
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-5">
      <div className="flex justify-between items-start gap-3 mb-2">
        <Link href={`/markets/${market.id.toString()}`} className="font-semibold text-ink-900 leading-snug hover:text-shield-700">
          {market.description}
        </Link>
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
      <p className="text-sm text-ink-500 mb-3">
        M{magnitude.toFixed(1)}+ within {market.radiusKm.toString()}km
        {!market.resolved && ` · ${timeUntil(market.resolutionTime)}`}
      </p>

      <div className="mb-3">
        <div className="flex h-2 rounded-full overflow-hidden bg-ink-100">
          <div className="bg-shield-500" style={{ width: `${yesPct}%` }} />
          <div className="bg-quake-400" style={{ width: `${noPct}%` }} />
        </div>
        <div className="flex justify-between text-xs font-medium mt-1">
          <span className="text-shield-700">YES {yesPct.toFixed(0)}%</span>
          <span className="text-quake-700">NO {noPct.toFixed(0)}%</span>
        </div>
      </div>

      {marketClosed ? (
        <p className="text-xs text-ink-400">
          {market.resolved ? "Market resolved." : "Trading closed — awaiting resolution."}
        </p>
      ) : step === "done" ? (
        <div>
          <p className="text-sm text-shield-700 mb-1">One-off {side.toUpperCase()} purchase complete.</p>
          {buyTxHash && (
            <a
              href={`${getExplorerUrl(chainId)}/tx/${buyTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-shield-600 hover:text-shield-700"
            >
              View transaction →
            </a>
          )}
          <button onClick={reset} type="button" className="text-xs text-ink-400 hover:text-ink-600 block mt-1">
            Make another trade
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setSide("yes")}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                side === "yes" ? "bg-shield-600 text-white" : "bg-ink-100 text-ink-600"
              }`}
            >
              Buy YES
            </button>
            <button
              onClick={() => setSide("no")}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                side === "no" ? "bg-quake-500 text-white" : "bg-ink-100 text-ink-600"
              }`}
            >
              Buy NO
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24 border border-ink-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
            />
            <button
              onClick={handleBuy}
              disabled={isPending || amountIn <= 0n}
              className="flex-1 bg-shield-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-shield-700 transition-colors disabled:opacity-50"
            >
              {step === "approving" ? "Approving…" : step === "buying" ? "Buying…" : `Buy ${side.toUpperCase()} (one-off)`}
            </button>
          </div>
          {error && <p className="text-xs text-quake-700 mt-2">{error}</p>}
        </>
      )}
    </div>
  );
}

/** Prediction markets, embedded directly in the dashboard. Buying shares here
 * is a single one-off payment (approve + buy), unlike a policy purchase which
 * is a recurring premium. */
export function MarketsSection() {
  const chainId = useChainId();
  const { EARTHQUAKE_MARKET_ADDRESS } = getContracts(chainId);
  const marketsConfigured = Boolean(EARTHQUAKE_MARKET_ADDRESS);
  const { markets, isLoading, refetch } = useMarkets();

  if (!marketsConfigured) return null;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-ink-900">Earthquake Markets</h2>
        <p className="text-sm text-ink-500">Trade YES/NO — one-off payment per trade</p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-ink-100 p-5">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3.5 w-1/2 mb-3" />
              <Skeleton className="h-2 w-full rounded-full mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-7 flex-1 rounded-lg" />
                <Skeleton className="h-7 flex-1 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center text-ink-500">
          <p>No markets yet. Check back once markets are created for this network.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map((market) => (
            <MarketBuyCard key={market.id.toString()} market={market} onTraded={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
