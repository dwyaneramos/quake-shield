"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, EARTHQUAKE_MARKET_ABI, MARKET_CONTRACTS_CONFIGURED } from "@/lib/contracts";
import type { EarthquakeMarket } from "@/types";

const marketContract = {
  address: CONTRACTS.EARTHQUAKE_MARKET_ADDRESS as `0x${string}`,
  abi: EARTHQUAKE_MARKET_ABI,
} as const;

export interface MarketWithOdds extends EarthquakeMarket {
  yesProbability: number; // 0-1
  noProbability: number; // 0-1
}

/** Fetch all markets and compute implied odds. */
export function useMarkets() {
  const { data: marketCount, isLoading: countLoading } = useReadContract({
    ...marketContract,
    functionName: "getMarketCount",
    query: { enabled: MARKET_CONTRACTS_CONFIGURED, refetchInterval: 15_000 },
  });

  const count = marketCount ? Number(marketCount) : 0;

  const marketCalls = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        ...marketContract,
        functionName: "getMarket" as const,
        args: [BigInt(i)] as const,
      })),
    [count]
  );

  const { data: marketResults, isLoading: marketsLoading, refetch } = useReadContracts({
    contracts: marketCalls,
    query: { enabled: marketCalls.length > 0 },
  });

  const markets: MarketWithOdds[] = useMemo(
    () =>
      (marketResults ?? [])
        .filter((r) => r.status === "success")
        .map((r, idx) => {
          const data = r.result as unknown[];
          const m: EarthquakeMarket = {
            id: BigInt(idx),
            description: data[0] as string,
            centerLat: data[1] as bigint,
            centerLng: data[2] as bigint,
            radiusKm: data[3] as bigint,
            triggerMagnitude: data[4] as bigint,
            resolutionTime: data[5] as bigint,
            yesReserve: data[6] as bigint,
            noReserve: data[7] as bigint,
            usdcCollateral: data[8] as bigint,
            resolved: data[9] as boolean,
            outcomeYes: data[10] as boolean,
          };
          const total = m.yesReserve + m.noReserve;
          const yesProb = total > 0 ? Number((m.noReserve * 10000n) / total) / 10000 : 0.5;
          return {
            ...m,
            yesProbability: yesProb,
            noProbability: 1 - yesProb,
          };
        }),
    [marketResults]
  );

  return {
    markets,
    isLoading: countLoading || marketsLoading,
    refetch,
  };
}

/** Fetch a single market by ID. */
export function useMarket(marketId: bigint | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    ...marketContract,
    functionName: "getMarket",
    args: marketId !== undefined ? [marketId] : undefined,
    query: { enabled: MARKET_CONTRACTS_CONFIGURED && marketId !== undefined },
  });

  const market: MarketWithOdds | undefined = useMemo(() => {
    if (!data) return undefined;
    const d = data as unknown[];
    const m: EarthquakeMarket = {
      id: marketId!,
      description: d[0] as string,
      centerLat: d[1] as bigint,
      centerLng: d[2] as bigint,
      radiusKm: d[3] as bigint,
      triggerMagnitude: d[4] as bigint,
      resolutionTime: d[5] as bigint,
      yesReserve: d[6] as bigint,
      noReserve: d[7] as bigint,
      usdcCollateral: d[8] as bigint,
      resolved: d[9] as boolean,
      outcomeYes: d[10] as boolean,
    };
    const total = m.yesReserve + m.noReserve;
    const yesProb = total > 0 ? Number((m.noReserve * 10000n) / total) / 10000 : 0.5;
    return {
      ...m,
      yesProbability: yesProb,
      noProbability: 1 - yesProb,
    };
  }, [data, marketId]);

  return { market, isLoading, refetch };
}

/** Fetch user's YES and NO share balances for a market. */
export function useUserShares(marketId: bigint | undefined) {
  const { address, isConnected } = useAccount();

  const { data: yesShares, isLoading: yesLoading } = useReadContract({
    ...marketContract,
    functionName: "yesSharesOf",
    args: marketId !== undefined && address ? [marketId, address] : undefined,
    query: { enabled: MARKET_CONTRACTS_CONFIGURED && isConnected && marketId !== undefined && Boolean(address) },
  });

  const { data: noShares, isLoading: noLoading } = useReadContract({
    ...marketContract,
    functionName: "noSharesOf",
    args: marketId !== undefined && address ? [marketId, address] : undefined,
    query: { enabled: MARKET_CONTRACTS_CONFIGURED && isConnected && marketId !== undefined && Boolean(address) },
  });

  return {
    yesShares: yesShares ?? 0n,
    noShares: noShares ?? 0n,
    isLoading: yesLoading || noLoading,
    isConnected,
  };
}
