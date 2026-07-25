"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import {
  DNZD_ABI,
  QUAKESHIELD_ABI,
  getContracts,
  isChainConfigured,
} from "@/lib/contracts";
import { getFriendlyTxErrorMessage } from "@/lib/errors";
import type { InvestmentPosition, Region } from "@/types";

function useQuakeShieldContract() {
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS } = getContracts(chainId);
  const configured = isChainConfigured(chainId);

  const contract = useMemo(
    () => ({ address: QUAKESHIELD_ADDRESS as `0x${string}`, abi: QUAKESHIELD_ABI }) as const,
    [QUAKESHIELD_ADDRESS],
  );

  return { contract, configured };
}

/**
 * Every investable region, with the return each currently pays.
 *
 * The APR comes from the contract rather than being recomputed here — it's
 * derived on-chain from the oracle's risk score, so this is the same number
 * an investor's returns are actually calculated from.
 */
export function useRegions() {
  const { contract, configured } = useQuakeShieldContract();

  const { data: regionCount, isLoading: countLoading } = useReadContract({
    ...contract,
    functionName: "getRegionCount",
    query: { enabled: configured, refetchInterval: 60_000 },
  });

  const ids = useMemo(
    () => Array.from({ length: Number(regionCount ?? 0n) }, (_, i) => BigInt(i)),
    [regionCount],
  );

  const { data, isLoading, refetch } = useReadContracts({
    contracts: ids.flatMap((id) => [
      { ...contract, functionName: "getRegion" as const, args: [id] as const },
      { ...contract, functionName: "getRegionAprBps" as const, args: [id] as const },
    ]),
    query: { enabled: ids.length > 0, refetchInterval: 30_000 },
  });

  const regions: Region[] = useMemo(() => {
    if (!data) return [];

    return ids.flatMap((_, index) => {
      const regionResult = data[index * 2];
      const aprResult = data[index * 2 + 1];
      if (regionResult?.status !== "success" || aprResult?.status !== "success") return [];

      const region = regionResult.result as Omit<Region, "id" | "aprBps">;
      return [{ ...region, id: index, aprBps: aprResult.result as bigint }];
    });
  }, [data, ids]);

  return { regions, isLoading: countLoading || isLoading, refetch };
}

/** A single region by ID, plus its live APR. */
export function useRegion(regionId: number | undefined) {
  const { regions, isLoading, refetch } = useRegions();
  const region = regionId === undefined ? undefined : regions.find((r) => r.id === regionId);
  return { region, isLoading, refetch };
}

/** The connected wallet's position in every region it has invested in. */
export function useMyInvestments() {
  const { address, isConnected } = useAccount();
  const { contract, configured } = useQuakeShieldContract();

  const { data: regionIds, isLoading: idsLoading, refetch: refetchIds } = useReadContract({
    ...contract,
    functionName: "getInvestorRegions",
    args: address ? [address] : undefined,
    query: { enabled: configured && isConnected && Boolean(address) },
  });

  const { data, isLoading, refetch } = useReadContracts({
    contracts: (regionIds ?? []).map((id) => ({
      ...contract,
      functionName: "getInvestment" as const,
      args: [id, address as `0x${string}`] as const,
    })),
    query: { enabled: Boolean(address) && (regionIds ?? []).length > 0, refetchInterval: 30_000 },
  });

  const positions: InvestmentPosition[] = useMemo(() => {
    if (!data || !regionIds) return [];

    return data.flatMap((result, index) => {
      if (result.status !== "success") return [];
      const [shares, value] = result.result as [bigint, bigint];
      if (shares === 0n) return [];
      return [{ regionId: Number(regionIds[index]), shares, value }];
    });
  }, [data, regionIds]);

  const totalValue = useMemo(
    () => positions.reduce((sum, position) => sum + position.value, 0n),
    [positions],
  );

  return {
    positions,
    totalValue,
    isLoading: idsLoading || isLoading,
    refetch: useCallback(async () => {
      await refetchIds();
      await refetch();
    }, [refetchIds, refetch]),
  };
}

/** The connected wallet's position in one specific region. */
export function useMyRegionPosition(regionId: number | undefined) {
  const { address, isConnected } = useAccount();
  const { contract, configured } = useQuakeShieldContract();

  const { data, isLoading, refetch } = useReadContract({
    ...contract,
    functionName: "getInvestment",
    args:
      address !== undefined && regionId !== undefined
        ? [BigInt(regionId), address]
        : undefined,
    query: {
      enabled: configured && isConnected && Boolean(address) && regionId !== undefined,
      refetchInterval: 15_000,
    },
  });

  const position = data ? { shares: data[0], value: data[1] } : undefined;
  return { position, isLoading, refetch };
}

/** The connected wallet's spendable DNZD. */
export function useDNZDBalance() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { DNZD_ADDRESS } = getContracts(chainId);

  const { data, isLoading, refetch } = useReadContract({
    address: DNZD_ADDRESS as `0x${string}`,
    abi: DNZD_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && DNZD_ADDRESS) && isConnected,
      refetchInterval: 15_000,
    },
  });

  return { balance: data ?? 0n, isLoading, refetch };
}

/** What the next fortnightly settlement would pay a region right now. */
export function usePreviewAccrual(regionId: number | undefined) {
  const { contract, configured } = useQuakeShieldContract();

  const { data, isLoading, refetch } = useReadContract({
    ...contract,
    functionName: "previewAccrual",
    args: regionId !== undefined ? [BigInt(regionId)] : undefined,
    query: { enabled: configured && regionId !== undefined, refetchInterval: 60_000 },
  });

  return {
    periodsDue: data?.[0] ?? 0n,
    pendingInterest: data?.[1] ?? 0n,
    isLoading,
    refetch,
  };
}

export type InvestStep = "idle" | "approving" | "investing" | "done" | "error";

/** Investing is two transactions: approve the DNZD spend, then invest. */
export function useInvest() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS, DNZD_ADDRESS } = getContracts(chainId);
  const publicClient = usePublicClient();
  const [step, setStep] = useState<InvestStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: DNZD_ADDRESS as `0x${string}`,
    abi: DNZD_ABI,
    functionName: "allowance",
    args: address ? [address, QUAKESHIELD_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: Boolean(address && DNZD_ADDRESS) },
  });

  const { writeContractAsync } = useWriteContract();

  const invest = useCallback(
    async (regionId: number, amount: bigint) => {
      if (!publicClient) throw new Error("Wallet not connected");

      setError(null);
      setTxHash(undefined);
      try {
        if ((allowance ?? 0n) < amount) {
          setStep("approving");
          const approveHash = await writeContractAsync({
            address: DNZD_ADDRESS as `0x${string}`,
            abi: DNZD_ABI,
            functionName: "approve",
            args: [QUAKESHIELD_ADDRESS as `0x${string}`, amount],
          });
          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveHash,
          });
          if (approveReceipt.status !== "success") {
            throw new Error("The approval transaction reverted on-chain.");
          }
          await refetchAllowance();
        }

        setStep("investing");
        const hash = await writeContractAsync({
          address: QUAKESHIELD_ADDRESS as `0x${string}`,
          abi: QUAKESHIELD_ABI,
          functionName: "invest",
          args: [BigInt(regionId), amount],
        });
        setTxHash(hash);
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
      allowance,
      publicClient,
      refetchAllowance,
      writeContractAsync,
      QUAKESHIELD_ADDRESS,
      DNZD_ADDRESS,
    ],
  );

  return {
    invest,
    step,
    error,
    isPending: step === "approving" || step === "investing",
    txHash,
    reset: () => {
      setStep("idle");
      setError(null);
      setTxHash(undefined);
    },
  };
}

export type WithdrawStep = "idle" | "withdrawing" | "done" | "error";

/** Withdraw part or all of a region position back to the wallet. */
export function useWithdrawInvestment() {
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS } = getContracts(chainId);
  const publicClient = usePublicClient();
  const [step, setStep] = useState<WithdrawStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();

  const withdraw = useCallback(
    async (regionId: number, amount: bigint) => {
      if (!publicClient) throw new Error("Wallet not connected");

      setError(null);
      setTxHash(undefined);
      try {
        setStep("withdrawing");
        const hash = await writeContractAsync({
          address: QUAKESHIELD_ADDRESS as `0x${string}`,
          abi: QUAKESHIELD_ABI,
          functionName: "withdrawInvestment",
          args: [BigInt(regionId), amount],
        });
        setTxHash(hash);
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
    [publicClient, writeContractAsync, QUAKESHIELD_ADDRESS],
  );

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

/**
 * Trigger a region's overdue fortnightly settlement.
 *
 * The oracle does this on schedule, but the call is permissionless, so an
 * investor never has to wait on it to see interest they're already owed.
 */
export function useAccrueRegion() {
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS } = getContracts(chainId);
  const publicClient = usePublicClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const accrue = useCallback(
    async (regionId: number) => {
      if (!publicClient) throw new Error("Wallet not connected");

      setError(null);
      setIsPending(true);
      try {
        const hash = await writeContractAsync({
          address: QUAKESHIELD_ADDRESS as `0x${string}`,
          abi: QUAKESHIELD_ABI,
          functionName: "accrueRegion",
          args: [BigInt(regionId)],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error("The transaction reverted on-chain.");
        }
      } catch (e) {
        setError(getFriendlyTxErrorMessage(e));
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, writeContractAsync, QUAKESHIELD_ADDRESS],
  );

  return { accrue, isPending, error };
}
