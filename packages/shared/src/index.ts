// ============ Scaled Value Helpers ============

/**
 * Scale magnitude from human-readable to contract format (×100)
 * Example: 6.0 → 600
 */
export function scaleMagnitude(human: number): number {
  return Math.round(human * 100);
}

/**
 * Unscale magnitude from contract format to human-readable
 * Example: 600 → 6.0
 */
export function unscaleMagnitude(scaled: number): number {
  return scaled / 100;
}

/**
 * Scale lat/lng from human-readable to contract format (×1e6)
 * Example: -41.2858 → -41285800
 */
export function scaleLatLng(human: number): number {
  return Math.round(human * 1_000_000);
}

/**
 * Unscale lat/lng from contract format to human-readable
 * Example: -41285800 → -41.2858
 */
export function unscaleLatLng(scaled: number): number {
  return scaled / 1_000_000;
}

/**
 * Scale USDC amount from human-readable to contract format (×1e6)
 * Example: 1000 → 1000000000
 */
export function scaleUSDC(human: number): number {
  return Math.round(human * 1_000_000);
}

/**
 * Unscale USDC amount from contract format to human-readable
 * Example: 1000000000 → 1000
 */
export function unscaleUSDC(scaled: number): number {
  return scaled / 1_000_000;
}

// ============ Distance Calculation ============

/**
 * Calculate distance between two lat/lng points (Haversine formula)
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ============ Constants ============

export const POLYGON_AMOY_CHAIN_ID = 80002;

export const MAGNITUDE_LABELS: Record<number, string> = {
  0: "Micro",
  1: "Micro",
  2: "Micro",
  3: "Minor",
  4: "Light",
  5: "Moderate",
  6: "Strong",
  7: "Major",
  8: "Great",
};

export function getMagnitudeLabel(magnitude: number): string {
  const floor = Math.floor(magnitude);
  return MAGNITUDE_LABELS[floor] || "Great";
}

export const MMI_LABELS: Record<number, string> = {
  1: "Not felt",
  2: "Weak",
  3: "Weak",
  4: "Light",
  5: "Moderate",
  6: "Strong",
  7: "Very strong",
  8: "Severe",
  9: "Violent",
  10: "Extreme",
};
