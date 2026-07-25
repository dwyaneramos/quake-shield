"use client";

import { useCallback, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { QUAKESHIELD_ABI, getContracts } from "@/lib/contracts";
import { getFriendlyTxErrorMessage } from "@/lib/errors";
import { estimateGasWithBuffer } from "@/lib/gas";

export type SimulateEarthquakeStep = "idle" | "recording" | "done" | "error";

export interface SimulateEarthquakeInput {
  magnitude: bigint; // x100
  latitude: bigint; // x1e6
  longitude: bigint; // x1e6
  depth: bigint; // km
  publicId: string;
  /** Regions whose real boundary (see @quakeshield/shared) contains this epicenter — usually 0 or 1. */
  regionIds: number[];
}

/**
 * Calls the same on-chain entry point (`recordEarthquake`) the real GeoNet
 * oracle uses, so it triggers real policy payouts — but it's gated by
 * `onlyOracle`, so it only succeeds if the connected wallet is the
 * configured oracle address for this deployment.
 */
export function useSimulateEarthquake() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { QUAKESHIELD_ADDRESS } = getContracts(chainId);
  const publicClient = usePublicClient();
  const [step, setStep] = useState<SimulateEarthquakeStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();

  const simulateEarthquake = useCallback(
    async (input: SimulateEarthquakeInput) => {
      if (!publicClient) throw new Error("Wallet not connected");
      if (!address) throw new Error("Wallet not connected");

      setError(null);
      setTxHash(undefined);
      setStep("recording");
      try {
        const params = {
          address: QUAKESHIELD_ADDRESS as `0x${string}`,
          abi: QUAKESHIELD_ABI,
          functionName: "recordEarthquake" as const,
          args: [
            input.magnitude,
            input.latitude,
            input.longitude,
            input.depth,
            input.publicId,
            input.regionIds.map((id) => BigInt(id)),
          ] as const,
        };
        const gas = await estimateGasWithBuffer(publicClient, { ...params, account: address });
        const hash = await writeContractAsync({ ...params, gas });
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
    [address, publicClient, writeContractAsync, QUAKESHIELD_ADDRESS]
  );

  return {
    simulateEarthquake,
    step,
    error,
    isPending: step === "recording",
    txHash,
    reset: () => {
      setStep("idle");
      setError(null);
      setTxHash(undefined);
    },
  };
}
