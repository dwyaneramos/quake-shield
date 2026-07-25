"use client";

import { useCallback, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import {
  MOCK_dnzd_ABI,
  QUAKESHIELD_ABI,
  getContracts,
  isChainConfigured,
} from "@/lib/contracts";
import type { ProviderPosition } from "@/types";

export type DepositStep =
  | "idle"
  | "approving"
  | "depositing"
  | "done"
  | "error";

/** Deposit dnzd as a capital provider (approve + deposit). */
export function useDeposit() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS, dnzd_ADDRESS } = getContracts(chainId);
  const publicClient = usePublicClient();
  const [step, setStep] = useState<DepositStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: dnzd_ADDRESS as `0x${string}`,
    abi: MOCK_dnzd_ABI,
    functionName: "allowance",
    args: address ? [address, QUAKESHIELD_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: Boolean(address && dnzd_ADDRESS) },
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
            address: dnzd_ADDRESS as `0x${string}`,
            abi: MOCK_dnzd_ABI,
            functionName: "approve",
            args: [QUAKESHIELD_ADDRESS as `0x${string}`, amount],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          await refetchAllowance();
        }

        setStep("depositing");
        const hash = await writeContractAsync({
          address: QUAKESHIELD_ADDRESS as `0x${string}`,
          abi: QUAKESHIELD_ABI,
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
    [
      allowance,
      publicClient,
      refetchAllowance,
      writeContractAsync,
      QUAKESHIELD_ADDRESS,
      dnzd_ADDRESS,
    ],
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
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS } = getContracts(chainId);
  const publicClient = usePublicClient();
  const [step, setStep] = useState<"idle" | "withdrawing" | "done" | "error">(
    "idle",
  );
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
        address: QUAKESHIELD_ADDRESS as `0x${string}`,
        abi: QUAKESHIELD_ABI,
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
  }, [publicClient, writeContractAsync, QUAKESHIELD_ADDRESS]);

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
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS } = getContracts(chainId);
  const configured = isChainConfigured(chainId);

  const { data, isLoading, refetch } = useReadContract({
    address: QUAKESHIELD_ADDRESS as `0x${string}`,
    abi: QUAKESHIELD_ABI,
    functionName: "getProviderInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: configured && isConnected && Boolean(address),
      refetchInterval: 30_000,
    },
  });

  const position: ProviderPosition | undefined = data
    ? { shares: data[0], currentValue: data[1] }
    : undefined;

  return { position, isLoading, refetch };
}
