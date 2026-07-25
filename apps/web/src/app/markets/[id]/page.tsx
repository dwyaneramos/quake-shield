"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { Header } from "@/components/layout/Header";
import { MARKET_CONTRACTS_CONFIGURED } from "@/lib/contracts";
import { POLYGON_AMOY } from "@/lib/polygon";
import { useBuyShares, computeSharesOut } from "@/lib/hooks/useBuyShares";
import { useMarket, useUserShares } from "@/lib/hooks/useMarkets";
import { useRedeem } from "@/lib/hooks/useRedeem";
import { SCALE } from "@/types";

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params?.id ? BigInt(params.id as string) : undefined;
  const { isConnected } = useAccount();
  const { market, isLoading } = useMarket(marketId);
  const { yesShares, noShares } = useUserShares(marketId);

  const [amountIn, setAmountIn] = useState("");
  const [side, setSide] = useState<"yes" | "no">("yes");

  const amountNum = Number(amountIn) || 0;
  const amountScaled = SCALE.toUSDC(amountNum);

  const estimatedShares = useMemo(() => {
    if (!market || amountScaled === 0n) return 0n;
    if (side === "yes") {
      return computeSharesOut(market.noReserve, market.yesReserve, amountScaled);
    } else {
      return computeSharesOut(market.yesReserve, market.noReserve, amountScaled);
    }
  }, [market, amountScaled, side]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8 text-center text-ink-500">Loading market…</main>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-ink-50">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8 text-center text-ink-500">Market not found.</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MarketHeader market={market} />
        <OddsBar market={market} />

        {!MARKET_CONTRACTS_CONFIGURED && (
          <div className="bg-quake-50 border border-quake-200 text-quake-800 rounded-xl p-4 mb-6 text-sm">
            Contracts aren&rsquo;t deployed yet — set the contract addresses in{" "}
            <code>apps/web/.env.local</code> to enable trading.
          </div>
        )}

        {market.resolved ? (
          <RedeemSection market={market} yesShares={yesShares} noShares={noShares} marketId={market.id} />
        ) : (
          <BuySection
            market={market}
            side={side}
            setSide={setSide}
            amountIn={amountIn}
            setAmountIn={setAmountIn}
            amountNum={amountNum}
            amountScaled={amountScaled}
            estimatedShares={estimatedShares}
            isConnected={isConnected}
            marketId={market.id}
          />
        )}

        {yesShares > 0n && (
          <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-4 mt-4">
            <p className="text-sm text-ink-600">
              Your shares: <span className="font-semibold">{SCALE.fromUSDC(yesShares).toLocaleString()} YES</span>
              {" · "}
              <span className="font-semibold">{SCALE.fromUSDC(noShares).toLocaleString()} NO</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function MarketHeader({ market }: { market: NonNullable<ReturnType<typeof useMarket>["market"]> }) {
  const magnitude = SCALE.fromMagnitude(market.triggerMagnitude);
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Number(market.resolutionTime) - now;

  let statusText: string;
  if (market.resolved) {
    statusText = market.outcomeYes ? "Resolved: YES" : "Resolved: NO";
  } else if (timeLeft <= 0) {
    statusText = "Awaiting resolution";
  } else {
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    statusText = days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6 mb-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-lg bg-quake-100 text-quake-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
          M{magnitude.toFixed(1)}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-ink-900 mb-1">{market.description}</h1>
          <p className="text-sm text-ink-500">{statusText}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-ink-50 rounded-lg p-3 text-center">
          <div className="text-ink-500">Magnitude</div>
          <div className="font-semibold text-ink-900">≥ M{magnitude.toFixed(1)}</div>
        </div>
        <div className="bg-ink-50 rounded-lg p-3 text-center">
          <div className="text-ink-500">Radius</div>
          <div className="font-semibold text-ink-900">{market.radiusKm.toString()} km</div>
        </div>
        <div className="bg-ink-50 rounded-lg p-3 text-center">
          <div className="text-ink-500">Pool</div>
          <div className="font-semibold text-ink-900">{SCALE.fromUSDC(market.usdcCollateral).toLocaleString()} USDC</div>
        </div>
      </div>
    </div>
  );
}

function OddsBar({ market }: { market: NonNullable<ReturnType<typeof useMarket>["market"]> }) {
  const yesPercent = Math.round(market.yesProbability * 100);
  const noPercent = 100 - yesPercent;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-shield-700">YES {yesPercent}%</span>
            <span className="font-semibold text-quake-700">NO {noPercent}%</span>
          </div>
          <div className="h-3 bg-ink-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-shield-500 transition-all" style={{ width: `${yesPercent}%` }} />
            <div className="h-full bg-quake-500 transition-all" style={{ width: `${noPercent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BuySection({
  market,
  side,
  setSide,
  amountIn,
  setAmountIn,
  amountNum,
  amountScaled,
  estimatedShares,
  isConnected,
  marketId,
}: {
  market: NonNullable<ReturnType<typeof useMarket>["market"]>;
  side: "yes" | "no";
  setSide: (s: "yes" | "no") => void;
  amountIn: string;
  setAmountIn: (v: string) => void;
  amountNum: number;
  amountScaled: bigint;
  estimatedShares: bigint;
  isConnected: boolean;
  marketId: bigint;
}) {
  const { buyShares, step, error, isPending, buyTxHash, reset } = useBuyShares();

  const now = Math.floor(Date.now() / 1000);
  const isExpired = Number(market.resolutionTime) <= now;
  const canSubmit = isConnected && MARKET_CONTRACTS_CONFIGURED && amountScaled > 0n && !isPending && !isExpired;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await buyShares(marketId, side === "yes", amountScaled).catch(() => {});
  };

  if (step === "done") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center">
        <div className="w-16 h-16 bg-shield-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-ink-900 mb-2">Shares purchased</h2>
        <p className="text-ink-600 mb-4">
          You bought {SCALE.fromUSDC(estimatedShares).toLocaleString()} {side.toUpperCase()} shares.
        </p>
        {buyTxHash && (
          <a
            href={`${POLYGON_AMOY.blockExplorers.default.url}/tx/${buyTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-shield-600 hover:text-shield-700 block mb-4"
          >
            View transaction on Polygonscan →
          </a>
        )}
        <button
          onClick={reset}
          type="button"
          className="bg-ink-100 text-ink-700 px-6 py-2 rounded-lg font-semibold hover:bg-ink-200 transition-colors"
        >
          Buy More
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
      <h2 className="text-lg font-semibold text-ink-900 mb-4">Buy Shares</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide("yes")}
          type="button"
          className={`flex-1 py-2.5 rounded-lg font-semibold transition-colors ${
            side === "yes" ? "bg-shield-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
          }`}
        >
          YES
        </button>
        <button
          onClick={() => setSide("no")}
          type="button"
          className={`flex-1 py-2.5 rounded-lg font-semibold transition-colors ${
            side === "no" ? "bg-quake-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
          }`}
        >
          NO
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-2">Amount (USDC)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            placeholder="0.00"
            className="w-full border border-ink-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-shield-500 focus:border-shield-500"
          />
        </div>

        {amountScaled > 0n && (
          <div className="bg-ink-50 rounded-lg p-3 text-sm text-ink-600">
            Estimated output:{" "}
            <span className="font-semibold text-ink-900">
              {SCALE.fromUSDC(estimatedShares).toLocaleString()} {side.toUpperCase()} shares
            </span>
          </div>
        )}

        {error && <p className="text-sm text-quake-700">{error}</p>}

        {!isConnected ? (
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        ) : isExpired ? (
          <p className="text-sm text-quake-700 text-center">Trading closed — awaiting resolution.</p>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-shield-600 text-white py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === "approving"
              ? "Approving USDC…"
              : step === "buying"
                ? `Buying ${side.toUpperCase()}…`
                : `Buy ${side.toUpperCase()}`}
          </button>
        )}
      </form>
    </div>
  );
}

function RedeemSection({
  market,
  yesShares,
  noShares,
  marketId,
}: {
  market: NonNullable<ReturnType<typeof useMarket>["market"]>;
  yesShares: bigint;
  noShares: bigint;
  marketId: bigint;
}) {
  const { redeem, step, error, isPending, redeemTxHash, reset } = useRedeem();

  const winningShares = market.outcomeYes ? yesShares : noShares;
  const hasWinning = winningShares > 0n;

  const handleRedeem = async () => {
    await redeem(marketId).catch(() => {});
  };

  if (step === "done") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-8 text-center">
        <div className="w-16 h-16 bg-shield-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-shield-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-ink-900 mb-2">Redeemed!</h2>
        <p className="text-ink-600 mb-4">
          You received {SCALE.fromUSDC(winningShares).toLocaleString()} USDC.
        </p>
        {redeemTxHash && (
          <a
            href={`${POLYGON_AMOY.blockExplorers.default.url}/tx/${redeemTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-shield-600 hover:text-shield-700 block mb-4"
          >
            View transaction on Polygonscan →
          </a>
        )}
        <button
          onClick={reset}
          type="button"
          className="bg-ink-100 text-ink-700 px-6 py-2 rounded-lg font-semibold hover:bg-ink-200 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-ink-100 p-6">
      <h2 className="text-lg font-semibold text-ink-900 mb-2">Market Resolved</h2>
      <p className="text-ink-600 mb-4">
        Outcome: <span className="font-semibold">{market.outcomeYes ? "YES" : "NO"}</span>
      </p>

      {hasWinning ? (
        <div>
          <p className="text-sm text-ink-600 mb-4">
            You have <span className="font-semibold">{SCALE.fromUSDC(winningShares).toLocaleString()}</span>{" "}
            winning shares worth <span className="font-semibold">{SCALE.fromUSDC(winningShares).toLocaleString()} USDC</span>.
          </p>
          {error && <p className="text-sm text-quake-700 mb-2">{error}</p>}
          <button
            onClick={handleRedeem}
            disabled={isPending}
            className="w-full bg-shield-600 text-white py-3 rounded-lg font-semibold hover:bg-shield-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "Redeeming…" : "Redeem Winnings"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-500">No winning shares to redeem.</p>
      )}
    </div>
  );
}
