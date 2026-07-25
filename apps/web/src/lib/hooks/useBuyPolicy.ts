"use client";

import { useCallback, useState } from "react";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { MOCK_USDC_ABI, QUAKESHIELD_ABI, getContracts } from "@/lib/contracts";
import { getFriendlyTxErrorMessage } from "@/lib/errors";

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
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS, USDC_ADDRESS } = getContracts(chainId);
  const publicClient = usePublicClient();
  const [step, setStep] = useState<BuyPolicyStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, QUAKESHIELD_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: Boolean(address && USDC_ADDRESS) },
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
            address: USDC_ADDRESS as `0x${string}`,
            abi: MOCK_USDC_ABI,
            functionName: "approve",
            args: [QUAKESHIELD_ADDRESS as `0x${string}`, premium],
          });
          const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
          if (approveReceipt.status !== "success") {
            throw new Error("The approval transaction reverted on-chain.");
          }
          await refetchAllowance();
        }

        setStep("buying");
        const hash = await writeContractAsync({
          address: QUAKESHIELD_ADDRESS as `0x${string}`,
          abi: QUAKESHIELD_ABI,
          functionName: "buyPolicy",
          args: [input.coverageAmount, input.triggerMagnitude, input.centerLat, input.centerLng, input.radiusKm],
        });
        setBuyTxHash(hash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error("The transaction reverted on-chain.");
        }

        setStep("done");
      } catch (e) {
        setStep("error");
        setError(getFriendlyTxErrorMessage(e));
        throw e;
      }
    },
    [allowance, publicClient, refetchAllowance, writeContractAsync, QUAKESHIELD_ADDRESS, USDC_ADDRESS]
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
