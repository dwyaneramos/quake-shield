"use client";

import { useMemo } from "react";
import { useChainId } from "wagmi";
import { EARTHQUAKE_MARKET_ABI, getContracts } from "@/lib/contracts";

/** Internal helper mirroring useQuakeShieldContract() — resolves the chain's
 * EarthquakeMarket address and hands back a ready-to-spread contract config. */
export function useEarthquakeMarketContract() {
  const chainId = useChainId();
  const { EARTHQUAKE_MARKET_ADDRESS } = getContracts(chainId);
  const configured = Boolean(EARTHQUAKE_MARKET_ADDRESS);

  const contract = useMemo(
    () => ({ address: EARTHQUAKE_MARKET_ADDRESS as `0x${string}`, abi: EARTHQUAKE_MARKET_ABI }) as const,
    [EARTHQUAKE_MARKET_ADDRESS]
  );

  return { contract, configured };
}
