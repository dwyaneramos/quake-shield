function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

/** Mirrors EarthquakeMarket.sol's _buy() exactly, so the quote shown matches
 * what the transaction will actually produce. */
export function previewBuy(yesReserve: bigint, noReserve: bigint, amountIn: bigint, isYes: boolean): bigint {
  if (amountIn <= 0n) return 0n;
  const k = yesReserve * noReserve;

  if (isYes) {
    const newNoReserve = noReserve + amountIn;
    const newYesReserve = ceilDiv(k, newNoReserve);
    return yesReserve > newYesReserve ? yesReserve - newYesReserve : 0n;
  }
  const newYesReserve = yesReserve + amountIn;
  const newNoReserve = ceilDiv(k, newYesReserve);
  return noReserve > newNoReserve ? noReserve - newNoReserve : 0n;
}
