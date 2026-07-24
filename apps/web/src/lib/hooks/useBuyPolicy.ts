"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { CONTRACTS, MOCK_USDC_ABI, QUAKESHIELD_ABI } from "@/lib/contracts";

export type BuyPolicyStep = "idle" | "approving" | "buying" | "done" | "error";

export interface BuyPolicyInput {
  coverageAmount: bigint; // USDC, 6 decimals
  triggerMagnitude: bigint; // x100
  centerLat: bigint; // x1e6
  centerLng: bigint; // x1e6
  radiusKm: bigint;
}

/** Buying a policy is two on-chain transactions: approve the premium spend, then buyPolicy. */
export function useBuyPolicy() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<BuyPolicyStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC_ADDRESS as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.QUAKESHIELD_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync } = useWriteContract();

  const buyPolicy = useCallback(
    async (input: BuyPolicyInput) => {
      if (!publicClient) throw new Error("Wallet not connected");

      setError(null);
      setBuyTxHash(undefined);
      try {
        // 1% premium — see QuakeShield.sol buyPolicy()
        const premium = (input.coverageAmount * 10n) / 1000n;
        const currentAllowance = allowance ?? 0n;

        if (currentAllowance < premium) {
          setStep("approving");
          const approveHash = await writeContractAsync({
            address: CONTRACTS.USDC_ADDRESS as `0x${string}`,
            abi: MOCK_USDC_ABI,
            functionName: "approve",
            args: [CONTRACTS.QUAKESHIELD_ADDRESS as `0x${string}`, premium],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          await refetchAllowance();
        }

        setStep("buying");
        const hash = await writeContractAsync({
          address: CONTRACTS.QUAKESHIELD_ADDRESS as `0x${string}`,
          abi: QUAKESHIELD_ABI,
          functionName: "buyPolicy",
          args: [input.coverageAmount, input.triggerMagnitude, input.centerLat, input.centerLng, input.radiusKm],
        });
        setBuyTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });

        setStep("done");
      } catch (e) {
        setStep("error");
        setError(e instanceof Error ? e.message : "Transaction failed");
        throw e;
      }
    },
    [allowance, publicClient, refetchAllowance, writeContractAsync]
  );

  return {
    buyPolicy,
    step,
    error,
    isPending: step === "approving" || step === "buying",
    buyTxHash,
    reset: () => {
      setStep("idle");
      setError(null);
      setBuyTxHash(undefined);
    },
  };
}
