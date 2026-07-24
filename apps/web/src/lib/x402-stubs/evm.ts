// Stub for the optional "@x402/evm" payment-protocol module — see next.config.ts.
// We don't use Coinbase's x402 payment flow, so this is never actually called.
export function toClientEvmSigner(): never {
  throw new Error("x402 payments are not supported in QuakeShield");
}
