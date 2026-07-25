import type { GeoNetQuake } from "./geonet.js";

/**
 * A region's boundaries as stored on-chain, unscaled back to degrees.
 * Read straight off the contract so the oracle can never disagree with it
 * about which ground belongs to which region.
 */
export interface RegionBounds {
  id: number;
  name: string;
  south: number;
  north: number;
  west: number;
  east: number;
}

/** Quakes below this magnitude are too common to say anything about risk. */
export const RISK_MIN_MAGNITUDE = 4;

/**
 * Weighted quake count at which a region is considered maximally risky.
 * Reaching it pins the region to the contract's MAX_APR_BPS.
 */
export const RISK_SATURATION = 100;

/** Inclusive on all edges — mirrors QuakeShield's `_isInRegion`. */
export function isInBounds(region: RegionBounds, lat: number, lng: number): boolean {
  return lat >= region.south && lat <= region.north && lng >= region.west && lng <= region.east;
}

/**
 * How much a single quake contributes to a region's risk. Each whole
 * magnitude step doubles the weight, so one M6 counts as much as four M4s —
 * a region's risk should be driven by the big events, not by swarms of
 * barely-felt ones.
 */
export function quakeWeight(magnitude: number): number {
  if (magnitude < RISK_MIN_MAGNITUDE) return 0;
  return Math.pow(2, magnitude - RISK_MIN_MAGNITUDE);
}

/**
 * Turn a region's recent seismicity into the 0-10000 risk score the contract
 * consumes.
 *
 * Log-scaled against RISK_SATURATION: the difference between a silent region
 * and a lightly active one matters more than the difference between busy and
 * very busy, which is also how the return should feel to an investor.
 */
export function computeRiskScoreBps(quakes: GeoNetQuake[], region: RegionBounds): number {
  let weighted = 0;

  for (const quake of quakes) {
    if (quake.latitude === undefined || quake.longitude === undefined) continue;
    if (!isInBounds(region, quake.latitude, quake.longitude)) continue;
    weighted += quakeWeight(quake.magnitude);
  }

  if (weighted <= 0) return 0;

  const score = Math.log10(1 + weighted) / Math.log10(1 + RISK_SATURATION);
  return Math.max(0, Math.min(10000, Math.round(score * 10000)));
}

/** Count of qualifying quakes in a region, for logging and sanity checks. */
export function countQuakesInRegion(quakes: GeoNetQuake[], region: RegionBounds): number {
  return quakes.filter(
    (quake) =>
      quake.magnitude >= RISK_MIN_MAGNITUDE &&
      quake.latitude !== undefined &&
      quake.longitude !== undefined &&
      isInBounds(region, quake.latitude, quake.longitude)
  ).length;
}
