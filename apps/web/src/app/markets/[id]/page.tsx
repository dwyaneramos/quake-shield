"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getContracts } from "@/lib/contracts";
import { getExplorerUrl } from "@/lib/chains";
import { useMarket } from "@/lib/hooks/useMarkets";
import { useBuyShares } from "@/lib/hooks/useBuyShares";
import { useRedeem } from "@/lib/hooks/useRedeem";
import { useUserShares } from "@/lib/hooks/useUserShares";
import { previewBuy } from "@/lib/marketMath";
import { SCALE } from "@/types";

function timeUntil(resolutionTime: bigint): string {
  const diff = Number(resolutionTime) - Date.now() / 1000;
  if (diff <= 0) return "Resolution due";
  const days = Math.floor(diff / 86400);
  if (days > 0) return `${days}d ${Math.floor((diff % 86400) / 3600)}h left`;
  const hours = Math.floor(diff / 3600);
  if (hours > 0) return `${hours}h left`;
  return `${Math.max(1, Math.floor(diff / 60))}m left`;
}

export default function MarketDetailPage() {
  const params = useParams<{ id: string }>();
  const marketId = useMemo(() => {
    try {
      return BigInt(params.id);
    } catch {
      return undefined;
    }
  }, [params.id]);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { EARTHQUAKE_MARKET_ADDRESS } = getContracts(chainId);
  const marketsConfigured = Boolean(EARTHQUAKE_MARKET_ADDRESS);
  const { openConnectModal } = useConnectModal();

  const { market, isLoading, refetch } = useMarket(marketId);
  const { yesShares, noShares, refetch: refetchShares } = useUserShares(marketId);
  const { buyShares, step: buyStep, error: buyError, isPending: buyPending, buyTxHash, reset: resetBuy } = useBuyShares();
  const { redeem, step: redeemStep, error: redeemError, isPending: redeemPending, redeemTxHash } = useRedeem();

  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("10");

  if (!marketsConfigured) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 text-sm">
            EarthquakeMarket isn&rsquo;t deployed on this network yet — switch
            networks in your wallet, or set the contract addresses for it in
            the root <code>.env</code> to see live markets.
          </div>
        </main>
      </div>
    );
  }

  if (isLoading || !market) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center text-ink-500">
          Loading market…
        </main>
      </div>
    );
  }

  const amountIn = SCALE.toUSDC(Number(amount) || 0);
  const previewShares = previewBuy(market.yesReserve, market.noReserve, amountIn, side === "yes");
  const yesPct = SCALE.fromOdds(market.yesPrice) * 100;
  const noPct = 100 - yesPct;
  const magnitude = SCALE.fromMagnitude(market.triggerMagnitude);
  const marketClosed = market.resolved || Date.now() / 1000 >= Number(market.resolutionTime);

  const winningShares = market.resolved ? (market.outcomeYes ? yesShares : noShares) : 0n;
  const canRedeem = market.resolved && winningShares > 0n;

  const handleBuy = async () => {
    if (!marketId || amountIn <= 0n) return;
    await buyShares(marketId, side === "yes", amountIn)
      .then(() => {
        refetch();
        refetchShares();
      })
      .catch(() => {});
  };

  const handleRedeem = async () => {
    if (!marketId) return;
    await redeem(marketId)
      .then(() => {
        refetch();
        refetchShares();
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-between items-start gap-3 mb-2">
          <h1 className="text-2xl font-bold text-ink-900">{market.description}</h1>
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
        <p className="text-ink-500 mb-8">
          M{magnitude.toFixed(1)}+ within {market.radiusKm.toString()}km ·{" "}
          {market.resolved ? "Resolved" : timeUntil(market.resolutionTime)}
        </p>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-ink-100 p-6">
            <div className="mb-4">
              <div className="flex h-3 rounded-full overflow-hidden bg-ink-100">
                <div className="bg-shield-500" style={{ width: `${yesPct}%` }} />
                <div className="bg-quake-400" style={{ width: `${noPct}%` }} />
              </div>
              <div className="flex justify-between text-sm font-medium mt-2">
                <span className="text-shield-700">YES {yesPct.toFixed(1)}%</span>
                <span className="text-quake-700">NO {noPct.toFixed(1)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm bg-ink-50 rounded-lg p-4 border border-ink-100">
              <div>
                <p className="text-ink-500">Your YES shares</p>
                <p className="font-semibold text-ink-900">{SCALE.fromUSDC(yesShares).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-ink-500">Your NO shares</p>
                <p className="font-semibold text-ink-900">{SCALE.fromUSDC(noShares).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-ink-100 p-6 h-fit">
            {market.resolved ? (
              <>
                <h2 className="font-semibold text-ink-900 mb-4">Redeem</h2>
                {canRedeem ? (
                  <>
                    <p className="text-sm text-ink-600 mb-4">
                      You hold {SCALE.fromUSDC(winningShares).toLocaleString()} winning shares, redeemable 1:1.
                    </p>
                    <button
                      onClick={handleRedeem}
                      disabled={redeemPending}
                      className="w-full bg-shield-600 text-white py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors disabled:opacity-50"
                    >
                      {redeemStep === "redeeming" ? "Redeeming…" : "Redeem Winnings"}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-ink-500">
                    {winningShares === 0n
                      ? "You have no winning shares in this market."
                      : "Already redeemed."}
                  </p>
                )}
                {redeemError && <p className="text-sm text-quake-700 mt-3">{redeemError}</p>}
                {redeemTxHash && (
                  <a
                    href={`${getExplorerUrl(chainId)}/tx/${redeemTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-shield-600 hover:text-shield-700 block mt-3"
                  >
                    View transaction on the block explorer →
                  </a>
                )}
              </>
            ) : (
              <>
                <h2 className="font-semibold text-ink-900 mb-4">Trade</h2>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSide("yes")}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      side === "yes" ? "bg-shield-600 text-white" : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    Buy YES
                  </button>
                  <button
                    onClick={() => setSide("no")}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      side === "no" ? "bg-quake-500 text-white" : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    Buy NO
                  </button>
                </div>

                <label className="block text-sm font-medium text-ink-700 mb-2">Amount</label>
                <input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500 mb-3"
                />

                <div className="bg-ink-50 rounded-lg p-4 border border-ink-100 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Estimated shares</span>
                    <span className="font-semibold text-ink-900">
                      {SCALE.fromUSDC(previewShares).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                </div>

                {marketClosed && (
                  <p className="text-sm text-quake-700 bg-quake-50 border border-quake-200 rounded-lg px-3 py-2 mb-3">
                    Trading is closed — awaiting resolution.
                  </p>
                )}
                {buyError && <p className="text-sm text-quake-700 mb-3">{buyError}</p>}

                <button
                  onClick={(e) => {
                    if (!isConnected) {
                      e.preventDefault();
                      openConnectModal?.();
                      return;
                    }
                    handleBuy();
                  }}
                  disabled={marketClosed || buyPending || amountIn <= 0n}
                  className="w-full bg-shield-600 text-white py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors disabled:opacity-50"
                >
                  {buyStep === "approving" ? "Approving…" : buyStep === "buying" ? "Buying…" : `Buy ${side.toUpperCase()}`}
                </button>

                {buyStep === "done" && (
                  <div className="mt-3">
                    <p className="text-sm text-shield-700 mb-1">Purchase complete.</p>
                    {buyTxHash && (
                      <a
                        href={`${getExplorerUrl(chainId)}/tx/${buyTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-shield-600 hover:text-shield-700"
                      >
                        View transaction on the block explorer →
                      </a>
                    )}
                    <button onClick={resetBuy} type="button" className="text-sm text-ink-400 hover:text-ink-600 block mt-2">
                      Make another trade
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
