"use client";

import { useCallback, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { CONTRACTS, EARTHQUAKE_MARKET_ABI } from "@/lib/contracts";

export type RedeemStep = "idle" | "redeeming" | "done" | "error";

export function useRedeem() {
  const publicClient = usePublicClient();
  const [step, setStep] = useState<RedeemStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [redeemTxHash, setRedeemTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();

  const redeem = useCallback(
    async (marketId: bigint) => {
      if (!publicClient) throw new Error("Wallet not connected");

      setError(null);
      setRedeemTxHash(undefined);
      try {
        setStep("redeeming");
        const hash = await writeContractAsync({
          address: CONTRACTS.EARTHQUAKE_MARKET_ADDRESS as `0x${string}`,
          abi: EARTHQUAKE_MARKET_ABI,
          functionName: "redeem",
          args: [marketId],
        });
        setRedeemTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        setStep("done");
      } catch (e) {
        setStep("error");
        setError(e instanceof Error ? e.message : "Redeem failed");
        throw e;
      }
    },
    [publicClient, writeContractAsync]
  );

  return {
    redeem,
    step,
    error,
    isPending: step === "redeeming",
    redeemTxHash,
    reset: () => {
      setStep("idle");
      setError(null);
      setRedeemTxHash(undefined);
    },
  };
}
