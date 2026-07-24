"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, CONTRACTS_CONFIGURED, QUAKESHIELD_ABI } from "@/lib/contracts";
import type { Policy, PoolStats } from "@/types";

const quakeShieldContract = {
  address: CONTRACTS.QUAKESHIELD_ADDRESS as `0x${string}`,
  abi: QUAKESHIELD_ABI,
} as const;

/** Aggregate stats for the insurance pool: premiums in, payouts out, balance, active policies. */
export function usePoolStats() {
  const { data, isLoading, refetch } = useReadContract({
    ...quakeShieldContract,
    functionName: "getPoolStats",
    query: { enabled: CONTRACTS_CONFIGURED, refetchInterval: 15_000 },
  });

  const stats: PoolStats | undefined = data
    ? {
        totalPremiums: data[0],
        totalPayouts: data[1],
        balance: data[2],
        activePolicies: data[3],
      }
    : undefined;

  return { stats, isLoading, refetch };
}

/** Policy IDs owned by the connected wallet, then the full Policy struct for each. */
export function useUserPolicies() {
  const { address, isConnected } = useAccount();

  const { data: policyIds, isLoading: idsLoading } = useReadContract({
    ...quakeShieldContract,
    functionName: "getUserPolicies",
    args: address ? [address] : undefined,
    query: { enabled: CONTRACTS_CONFIGURED && isConnected && Boolean(address) },
  });

  const policyCalls = useMemo(
    () =>
      (policyIds ?? []).map((id) => ({
        ...quakeShieldContract,
        functionName: "getPolicy" as const,
        args: [id] as const,
      })),
    [policyIds]
  );

  const { data: policyResults, isLoading: policiesLoading, refetch } = useReadContracts({
    contracts: policyCalls,
    query: { enabled: policyCalls.length > 0 },
  });

  const policies: Policy[] = useMemo(
    () =>
      (policyResults ?? [])
        .filter((r) => r.status === "success")
        .map((r) => r.result as Policy),
    [policyResults]
  );

  return {
    policies,
    isLoading: idsLoading || policiesLoading,
    isConnected,
    refetch,
  };
}
