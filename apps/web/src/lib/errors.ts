import { BaseError, ContractFunctionRevertedError, InsufficientFundsError, UserRejectedRequestError } from "viem";

/**
 * Maps wallet/contract write errors (viem/wagmi) to a short, user-facing message.
 * viem's `error.message`/`shortMessage` can include the raw RPC payload (provider
 * name, method, low-level node error text) which must never be shown directly in
 * the UI — every branch below returns a fixed, friendly string, and the original
 * error is logged for debugging instead of surfaced.
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
      return revertError.reason
        ? `The contract rejected this transaction: ${revertError.reason}`
        : "The contract rejected this transaction.";
    }
    if (/gas limit too high|intrinsic gas too low|exceeds block gas limit/i.test(e.details ?? e.shortMessage ?? "")) {
      return "Your wallet couldn't work out the right gas limit for this transaction. Please try again — if it keeps happening, try a different RPC in your wallet settings.";
    }
    console.error("Unhandled transaction error:", e);
    return "Transaction failed. Please try again.";
  }
  if (e instanceof Error && e.message.includes("reverted on-chain")) {
    return "The transaction was mined but reverted on-chain — no funds were deducted for a valid policy. This is often caused by insufficient token balance or allowance.";
  }
  console.error("Unhandled transaction error:", e);
  return "Transaction failed. Please try again.";
}
