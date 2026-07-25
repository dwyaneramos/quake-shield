import { BaseError, ContractFunctionRevertedError, InsufficientFundsError, UserRejectedRequestError } from "viem";

/**
 * Maps wallet/contract write errors (viem/wagmi) to a short, user-facing message.
 * viem's `error.message` includes the full RPC payload (contract args, calldata,
 * docs links) which must never be shown directly in the UI.
 */
export function getFriendlyTxErrorMessage(e: unknown): string {
  if (e instanceof BaseError) {
    if (e.walk((err) => err instanceof UserRejectedRequestError)) {
      return "Transaction cancelled — you rejected the request in your wallet.";
    }
    if (e.walk((err) => err instanceof InsufficientFundsError)) {
      return "Your wallet doesn't have enough funds to cover this transaction.";
    }
    const revertError = e.walk((err) => err instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      return revertError.reason ?? revertError.shortMessage ?? "The transaction was rejected by the contract.";
    }
    return e.shortMessage ?? "Transaction failed. Please try again.";
  }
  return "Transaction failed. Please try again.";
}
