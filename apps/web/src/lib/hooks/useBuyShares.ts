"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { CONTRACTS, EARTHQUAKE_MARKET_ABI, MOCK_USDC_ABI } from "@/lib/contracts";

export type BuySharesStep = "idle" | "approving" | "buying" | "done" | "error";

export function useBuyShares() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<BuySharesStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC_ADDRESS as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.EARTHQUAKE_MARKET_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync } = useWriteContract();

  const buyShares = useCallback(
    async (marketId: bigint, isYes: boolean, amountIn: bigint) => {
      if (!publicClient) throw new Error("Wallet not connected");

      setError(null);
      setBuyTxHash(undefined);
      try {
        const currentAllowance = allowance ?? 0n;

        if (currentAllowance < amountIn) {
          setStep("approving");
          const approveHash = await writeContractAsync({
            address: CONTRACTS.USDC_ADDRESS as `0x${string}`,
            abi: MOCK_USDC_ABI,
            functionName: "approve",
            args: [CONTRACTS.EARTHQUAKE_MARKET_ADDRESS as `0x${string}`, amountIn],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          await refetchAllowance();
        }

        setStep("buying");
        const hash = await writeContractAsync({
          address: CONTRACTS.EARTHQUAKE_MARKET_ADDRESS as `0x${string}`,
          abi: EARTHQUAKE_MARKET_ABI,
          functionName: isYes ? "buyYes" : "buyNo",
          args: [marketId, amountIn],
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
    buyShares,
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

/** Client-side CPMM quote preview — mirrors contract math exactly */
export function computeSharesOut(reserveIn: bigint, reserveOut: bigint, amountIn: bigint): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
  const k = reserveIn * reserveOut;
  const newReserveIn = reserveIn + amountIn;
  return reserveOut - (k / newReserveIn);
}
