"use client";

import { useCallback, useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { useEarthquakeMarketContract } from "./useEarthquakeMarketContract";

export type RedeemStep = "idle" | "redeeming" | "done" | "error";

/** Claim winnings from a resolved market. */
export function useRedeem() {
  const { contract } = useEarthquakeMarketContract();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<RedeemStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [redeemTxHash, setRedeemTxHash] = useState<`0x${string}` | undefined>();

  const redeem = useCallback(
    async (marketId: bigint) => {
      if (!publicClient) throw new Error("Wallet not connected");

      setError(null);
      setRedeemTxHash(undefined);
      try {
        setStep("redeeming");
        const hash = await writeContractAsync({
          ...contract,
          functionName: "redeem",
          args: [marketId],
        });
        setRedeemTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });

        setStep("done");
      } catch (e) {
        setStep("error");
        setError(e instanceof Error ? e.message : "Transaction failed");
        throw e;
      }
    },
    [publicClient, writeContractAsync, contract]
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
