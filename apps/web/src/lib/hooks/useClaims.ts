"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { CONTRACTS, CONTRACTS_CONFIGURED, QUAKESHIELD_ABI } from "@/lib/contracts";

export interface PayoutClaim {
  policyId: bigint;
  amount: bigint;
  quakeMagnitude: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

// Deployment block lets us avoid scanning the whole chain history on every load.
const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_QUAKE_SHIELD_DEPLOY_BLOCK || "0");

/** Payouts the connected wallet has received, read from PayoutExecuted event logs. */
export function useClaims() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [claims, setClaims] = useState<PayoutClaim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicClient || !address || !CONTRACTS_CONFIGURED) return;
    setIsLoading(true);
    setError(null);
    try {
      const logs = await publicClient.getContractEvents({
        address: CONTRACTS.QUAKESHIELD_ADDRESS as `0x${string}`,
        abi: QUAKESHIELD_ABI,
        eventName: "PayoutExecuted",
        args: { policyholder: address },
        fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
      });

      setClaims(
        logs
          .map((log) => ({
            policyId: log.args.policyId as bigint,
            amount: log.args.amount as bigint,
            quakeMagnitude: log.args.quakeMagnitude as bigint,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          }))
          .reverse()
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load claims");
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    load();
  }, [load]);

  return { claims, isLoading, error, isConnected, refetch: load };
}
