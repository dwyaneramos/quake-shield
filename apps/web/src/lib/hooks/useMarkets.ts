"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { useEarthquakeMarketContract } from "./useEarthquakeMarketContract";
import type { EarthquakeMarket } from "@/types";

export interface MarketWithOdds extends EarthquakeMarket {
  yesPrice: bigint;
  noPrice: bigint;
}

/** All markets on the connected chain, each with its live implied odds. */
export function useMarkets() {
  const { contract, configured } = useEarthquakeMarketContract();

  const { data: marketCount, isLoading: countLoading } = useReadContract({
    ...contract,
    functionName: "getMarketCount",
    query: { enabled: configured, refetchInterval: 15_000 },
  });

  const ids = useMemo(
    () => Array.from({ length: marketCount ? Number(marketCount) : 0 }, (_, i) => BigInt(i)),
    [marketCount]
  );

  const calls = useMemo(
    () => [
      ...ids.map((id) => ({ ...contract, functionName: "getMarket" as const, args: [id] as const })),
      ...ids.map((id) => ({ ...contract, functionName: "getMarketPrice" as const, args: [id] as const })),
    ],
    [ids, contract]
  );

  const { data: results, isLoading: resultsLoading, refetch } = useReadContracts({
    contracts: calls,
    query: { enabled: calls.length > 0 },
  });

  const markets: MarketWithOdds[] = useMemo(() => {
    if (!results) return [];
    const n = ids.length;

    return ids
      .map((id, i) => {
        const marketResult = results[i];
        const priceResult = results[n + i];
        if (marketResult?.status !== "success" || priceResult?.status !== "success") return null;

        const m = marketResult.result as Omit<EarthquakeMarket, "id">;
        const [yesPrice, noPrice] = priceResult.result as readonly [bigint, bigint];

        return { id, ...m, yesPrice, noPrice };
      })
      .filter((m): m is MarketWithOdds => m !== null);
  }, [results, ids]);

  return {
    markets,
    isLoading: countLoading || resultsLoading,
    configured,
    refetch,
  };
}

/** A single market by id, with its live implied odds. */
export function useMarket(marketId: bigint | undefined) {
  const { contract, configured } = useEarthquakeMarketContract();
  const enabled = configured && marketId !== undefined;

  const { data: marketData, isLoading: marketLoading, refetch: refetchMarket } = useReadContract({
    ...contract,
    functionName: "getMarket",
    args: marketId !== undefined ? [marketId] : undefined,
    query: { enabled, refetchInterval: 10_000 },
  });

  const { data: priceData, isLoading: priceLoading, refetch: refetchPrice } = useReadContract({
    ...contract,
    functionName: "getMarketPrice",
    args: marketId !== undefined ? [marketId] : undefined,
    query: { enabled, refetchInterval: 10_000 },
  });

  const market: MarketWithOdds | undefined = useMemo(() => {
    if (!marketData || !priceData || marketId === undefined) return undefined;
    const [yesPrice, noPrice] = priceData;
    return { id: marketId, ...(marketData as Omit<EarthquakeMarket, "id">), yesPrice, noPrice };
  }, [marketData, priceData, marketId]);

  return {
    market,
    isLoading: marketLoading || priceLoading,
    configured,
    refetch: () => {
      refetchMarket();
      refetchPrice();
    },
  };
}
