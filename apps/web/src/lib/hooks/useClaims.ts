"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { QUAKESHIELD_ABI, getContracts, isChainConfigured } from "@/lib/contracts";

// Some public RPCs (e.g. Avalanche Fuji's default endpoint) cap eth_getLogs
// to a fixed block range per call, so we page through history in chunks
// rather than requesting the full range in one request.
const LOG_QUERY_CHUNK_BLOCKS = 2000n;

export interface PayoutClaim {
  policyId: bigint;
  amount: bigint;
  quakeMagnitude: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

/** Payouts the connected wallet has received, read from PayoutExecuted event logs. */
export function useClaims() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS, DEPLOY_BLOCK } = getContracts(chainId);
  const configured = isChainConfigured(chainId);
  const publicClient = usePublicClient();
  const [claims, setClaims] = useState<PayoutClaim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicClient || !address || !configured) return;
    setIsLoading(true);
    setError(null);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const logs = [];
      for (let start = DEPLOY_BLOCK; start <= latestBlock; start += LOG_QUERY_CHUNK_BLOCKS) {
        const end = start + LOG_QUERY_CHUNK_BLOCKS - 1n;
        logs.push(
          ...(await publicClient.getContractEvents({
            address: QUAKESHIELD_ADDRESS as `0x${string}`,
            abi: QUAKESHIELD_ABI,
            eventName: "PayoutExecuted",
            args: { policyholder: address },
            fromBlock: start,
            toBlock: end > latestBlock ? latestBlock : end,
          }))
        );
      }

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
      console.warn("Failed to load claims:", e);
      setError("Unable to load claims history right now. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, QUAKESHIELD_ADDRESS, DEPLOY_BLOCK, configured]);

  useEffect(() => {
    load();
  }, [load]);

  return { claims, isLoading, error, isConnected, refetch: load };
}
