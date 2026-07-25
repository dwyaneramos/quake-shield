"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { CONTRACTS, CONTRACTS_CONFIGURED, MOCK_USDC_ABI, QUAKESHIELD_ABI } from "@/lib/contracts";
import type { ProviderPosition } from "@/types";

export type DepositStep = "idle" | "approving" | "depositing" | "done" | "error";

const quakeShieldContract = {
  address: CONTRACTS.QUAKESHIELD_ADDRESS as `0x${string}`,
  abi: QUAKESHIELD_ABI,
} as const;

/** Deposit USDC as a capital provider (approve + deposit). */
export function useDeposit() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<DepositStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC_ADDRESS as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.QUAKESHIELD_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync } = useWriteContract();

  const deposit = useCallback(
    async (amount: bigint) => {
      if (!publicClient) throw new Error("Wallet not connected");

      setError(null);
      setTxHash(undefined);
      try {
        const currentAllowance = allowance ?? 0n;

        if (currentAllowance < amount) {
          setStep("approving");
          const approveHash = await writeContractAsync({
            address: CONTRACTS.USDC_ADDRESS as `0x${string}`,
            abi: MOCK_USDC_ABI,
            functionName: "approve",
            args: [CONTRACTS.QUAKESHIELD_ADDRESS as `0x${string}`, amount],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          await refetchAllowance();
        }

        setStep("depositing");
        const hash = await writeContractAsync({
          ...quakeShieldContract,
          functionName: "deposit",
          args: [amount],
        });
        setTxHash(hash);
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
    deposit,
    step,
    error,
    isPending: step === "approving" || step === "depositing",
    txHash,
    reset: () => {
      setStep("idle");
      setError(null);
      setTxHash(undefined);
    },
  };
}

/** Withdraw full capital position. */
export function useWithdraw() {
  const publicClient = usePublicClient();
  const [step, setStep] = useState<"idle" | "withdrawing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();

  const withdraw = useCallback(async () => {
    if (!publicClient) throw new Error("Wallet not connected");

    setError(null);
    setTxHash(undefined);
    try {
      setStep("withdrawing");
      const hash = await writeContractAsync({
        ...quakeShieldContract,
        functionName: "withdraw",
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setStep("done");
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : "Transaction failed");
      throw e;
    }
  }, [publicClient, writeContractAsync]);

  return {
    withdraw,
    step,
    error,
    isPending: step === "withdrawing",
    txHash,
    reset: () => {
      setStep("idle");
      setError(null);
      setTxHash(undefined);
    },
  };
}

/** Read the connected wallet's capital provider position. */
export function useMyPosition() {
  const { address, isConnected } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    ...quakeShieldContract,
    functionName: "getProviderInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: CONTRACTS_CONFIGURED && isConnected && Boolean(address),
      refetchInterval: 15_000,
    },
  });

  const position: ProviderPosition | undefined = data
    ? { shares: data[0], currentValue: data[1] }
    : undefined;

  return { position, isLoading, refetch };
}
