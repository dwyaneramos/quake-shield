"use client";

import { useCallback, useState } from "react";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { MOCK_USDC_ABI, getContracts } from "@/lib/contracts";
import { useEarthquakeMarketContract } from "./useEarthquakeMarketContract";

export type BuySharesStep = "idle" | "approving" | "buying" | "done" | "error";

/** Buying shares is two on-chain transactions: approve the token spend, then buyYes/buyNo. */
export function useBuyShares() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { USDC_ADDRESS } = getContracts(chainId);
  const { contract } = useEarthquakeMarketContract();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<BuySharesStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, contract.address] : undefined,
    query: { enabled: Boolean(address && USDC_ADDRESS && contract.address) },
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
            address: USDC_ADDRESS as `0x${string}`,
            abi: MOCK_USDC_ABI,
            functionName: "approve",
            args: [contract.address, amountIn],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          await refetchAllowance();
        }

        setStep("buying");
        const hash = await writeContractAsync({
          ...contract,
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
    [allowance, publicClient, refetchAllowance, writeContractAsync, contract, USDC_ADDRESS]
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
