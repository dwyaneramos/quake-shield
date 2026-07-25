"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { DNZD_ABI, QUAKESHIELD_ABI, getContracts } from "@/lib/contracts";
import { getFriendlyTxErrorMessage } from "@/lib/errors";
import { estimateGasWithBuffer } from "@/lib/gas";

export type BuyPolicyStep = "idle" | "approving" | "buying" | "done" | "error";

export interface BuyPolicyInput {
  coverageAmount: bigint; // DNZD, 6 decimals
  triggerMagnitude: bigint; // x100
  centerLat: bigint; // x1e6
  centerLng: bigint; // x1e6
  radiusKm: bigint;
  recurring: boolean; // fortnightly premium plan vs one-off
}

/** Buying a policy is two on-chain transactions: approve the premium spend, then buyPolicy. */
export function useBuyPolicy() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS, DNZD_ADDRESS } = getContracts(chainId);
  const publicClient = usePublicClient();
  const [step, setStep] = useState<BuyPolicyStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: DNZD_ADDRESS as `0x${string}`,
    abi: DNZD_ABI,
    functionName: "allowance",
    args: address ? [address, QUAKESHIELD_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: Boolean(address && DNZD_ADDRESS) },
  });

  const { writeContractAsync } = useWriteContract();

  const buyPolicy = useCallback(
    async (input: BuyPolicyInput) => {
      if (!publicClient) throw new Error("Wallet not connected");
      if (!address) throw new Error("Wallet not connected");

      setError(null);
      setBuyTxHash(undefined);
      try {
        // 1% premium — see QuakeShield.sol buyPolicy()
        const premium = (input.coverageAmount * 10n) / 1000n;
        const currentAllowance = allowance ?? 0n;

        if (currentAllowance < premium) {
          setStep("approving");
          const approveParams = {
            address: DNZD_ADDRESS as `0x${string}`,
            abi: DNZD_ABI,
            functionName: "approve" as const,
            args: [QUAKESHIELD_ADDRESS as `0x${string}`, premium] as const,
          };
          const approveGas = await estimateGasWithBuffer(publicClient, {
            ...approveParams,
            account: address,
          });
          const approveHash = await writeContractAsync({
            ...approveParams,
            gas: approveGas,
          });
          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveHash,
          });
          if (approveReceipt.status !== "success") {
            throw new Error("The approval transaction reverted on-chain.");
          }
          await refetchAllowance();
        }

        setStep("buying");
        const buyParams = {
          address: QUAKESHIELD_ADDRESS as `0x${string}`,
          abi: QUAKESHIELD_ABI,
          functionName: "buyPolicy" as const,
          args: [
            input.coverageAmount,
            input.triggerMagnitude,
            input.centerLat,
            input.centerLng,
            input.radiusKm,
            input.recurring,
          ] as const,
        };
        const buyGas = await estimateGasWithBuffer(publicClient, {
          ...buyParams,
          account: address,
        });
        const hash = await writeContractAsync({ ...buyParams, gas: buyGas });
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
    [
      address,
      allowance,
      publicClient,
      refetchAllowance,
      writeContractAsync,
      QUAKESHIELD_ADDRESS,
      DNZD_ADDRESS,
    ],
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
