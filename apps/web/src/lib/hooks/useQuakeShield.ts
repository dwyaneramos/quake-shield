"use client";

import { useMemo } from "react";
import { useAccount, useChainId, useReadContract, useReadContracts } from "wagmi";
import { QUAKESHIELD_ABI, getContracts, isChainConfigured } from "@/lib/contracts";
import type { Policy, PoolStats } from "@/types";

function useQuakeShieldContract() {
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS } = getContracts(chainId);
  const configured = isChainConfigured(chainId);

  const contract = useMemo(
    () => ({ address: QUAKESHIELD_ADDRESS as `0x${string}`, abi: QUAKESHIELD_ABI }) as const,
    [QUAKESHIELD_ADDRESS]
  );

  return { contract, configured };
}

/** Aggregate stats for the insurance pool: premiums in, payouts out, balance, active policies. */
export function usePoolStats() {
  const { contract, configured } = useQuakeShieldContract();

  const { data, isLoading, refetch } = useReadContract({
    ...contract,
    functionName: "getPoolStats",
    query: { enabled: configured, refetchInterval: 30_000 },
  });

  const hasRealData = Boolean(data);
  const stats: PoolStats | undefined = data
    ? {
        totalPremiums: data[0],
        totalPayouts: data[1],
        balance: data[2],
        activePolicies: data[3],
        totalActiveCoverage: data[4],
        totalInvested: data[5],
        yieldReserve: data[6],
      }
    : isLoading
    ? undefined
    : MOCK_POOL_STATS;

  return { stats, isLoading, refetch, isMock: !isLoading && !hasRealData };
}

/** Realistic demo data shown when no on-chain data is available (e.g. wallet
 *  disconnected, wrong chain, or fresh deployment with no policies yet). */
const MOCK_POOL_STATS: PoolStats = {
  totalPremiums: 12_480_000_000n,   // $12,480
  totalPayouts: 5_200_000_000n,     // $5,200
  balance: 1_850_000_000_000n,      // $1,850,000
  activePolicies: 23n,
  totalActiveCoverage: 1_200_000_000_000n, // $1,200,000
  totalInvested: 900_000_000_000n,  // $900,000
  yieldReserve: 45_000_000_000n,    // $45,000
};

/** Policy IDs owned by the connected wallet, then the full Policy struct for each. */
export function useUserPolicies() {
  const { address, isConnected } = useAccount();
  const { contract, configured } = useQuakeShieldContract();

  const { data: policyIds, isLoading: idsLoading } = useReadContract({
    ...contract,
    functionName: "getUserPolicies",
    args: address ? [address] : undefined,
    query: { enabled: configured && isConnected && Boolean(address) },
  });

  const policyCalls = useMemo(
    () =>
      (policyIds ?? []).map((id) => ({
        ...contract,
        functionName: "getPolicy" as const,
        args: [id] as const,
      })),
    [policyIds, contract]
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
