import type { PublicClient } from "viem";

/**
 * Some wallets fall back to a wild, wrong gas limit (seen: 21,000,000 against
 * an RPC that caps individual txs at 16,777,216) when they can't estimate gas
 * themselves. Estimating here and passing it explicitly into `writeContract`
 * means the wallet never has to guess.
 */
const GAS_BUFFER_NUMERATOR = 130n;
const GAS_BUFFER_DENOMINATOR = 100n;

interface EstimateGasParams {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  account: `0x${string}`;
}

export async function estimateGasWithBuffer(
  publicClient: PublicClient,
  params: EstimateGasParams,
): Promise<bigint> {
  const estimate = await publicClient.estimateContractGas(params as never);
  return (estimate * GAS_BUFFER_NUMERATOR) / GAS_BUFFER_DENOMINATOR;
}
