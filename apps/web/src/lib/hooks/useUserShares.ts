"use client";

import { useAccount } from "wagmi";
import { useReadContracts } from "wagmi";
import { useEarthquakeMarketContract } from "./useEarthquakeMarketContract";

/** The connected wallet's YES/NO share balance in a single market. */
export function useUserShares(marketId: bigint | undefined) {
  const { address, isConnected } = useAccount();
  const { contract, configured } = useEarthquakeMarketContract();

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...contract, functionName: "yesSharesOf", args: marketId !== undefined && address ? [marketId, address] : undefined },
      { ...contract, functionName: "noSharesOf", args: marketId !== undefined && address ? [marketId, address] : undefined },
    ],
    query: { enabled: configured && isConnected && Boolean(address) && marketId !== undefined },
  });

  const yesShares = (data?.[0]?.status === "success" ? (data[0].result as bigint) : 0n);
  const noShares = (data?.[1]?.status === "success" ? (data[1].result as bigint) : 0n);

  return { yesShares, noShares, isLoading, refetch };
}
