"use client";

import { useCallback, useState } from "react";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { MOCK_USDC_ABI, QUAKESHIELD_ABI, getContracts } from "@/lib/contracts";
import { getFriendlyTxErrorMessage } from "@/lib/errors";

export type RenewPolicyStep = "idle" | "approving" | "renewing" | "done" | "error";

/** Pay the next fortnightly premium on a recurring policy: approve the premium spend, then renewPolicy(). */
export function useRenewPolicy() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS, DNZD_ADDRESS } = getContracts(chainId);
  const publicClient = usePublicClient();
  const [step, setStep] = useState<RenewPolicyStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [renewTxHash, setRenewTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: DNZD_ADDRESS as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, QUAKESHIELD_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: Boolean(address && DNZD_ADDRESS) },
  });

  const { writeContractAsync } = useWriteContract();

  const renewPolicy = useCallback(
    async (policyId: bigint, coverageAmount: bigint) => {
      if (!publicClient) throw new Error("Wallet not connected");

      setError(null);
      setRenewTxHash(undefined);
      try {
        // 1% premium — matches QuakeShield.sol renewPolicy()
        const premium = (coverageAmount * 10n) / 1000n;
        const currentAllowance = allowance ?? 0n;

        if (currentAllowance < premium) {
          setStep("approving");
          const approveHash = await writeContractAsync({
            address: DNZD_ADDRESS as `0x${string}`,
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

        setStep("renewing");
        const hash = await writeContractAsync({
          address: QUAKESHIELD_ADDRESS as `0x${string}`,
          abi: QUAKESHIELD_ABI,
          functionName: "renewPolicy",
          args: [policyId],
        });
        setRenewTxHash(hash);
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
    [allowance, publicClient, refetchAllowance, writeContractAsync, QUAKESHIELD_ADDRESS, DNZD_ADDRESS]
  );

  return {
    renewPolicy,
    step,
    error,
    isPending: step === "approving" || step === "renewing",
    renewTxHash,
    reset: () => {
      setStep("idle");
      setError(null);
      setRenewTxHash(undefined);
    },
  };
}
