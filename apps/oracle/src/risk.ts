import { NZ_REGIONS, isInRegion } from "@quakeshield/shared";
import type { GeoNetQuake } from "./geonet.js";

/** Quakes below this magnitude are too common to say anything about risk. */
export const RISK_MIN_MAGNITUDE = 4;

/**
 * Weighted quake count at which a region is considered maximally risky.
 * Reaching it pins the region to the contract's MAX_APR_BPS.
 */
export const RISK_SATURATION = 100;

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
 *
 * @param regionId Index into NZ_REGIONS, which is also the on-chain region ID.
 */
export function computeRiskScoreBps(quakes: GeoNetQuake[], regionId: number): number {
  const region = NZ_REGIONS[regionId];
  let weighted = 0;

  for (const quake of quakes) {
    if (quake.latitude === undefined || quake.longitude === undefined) continue;
    if (!isInRegion(region, quake.latitude, quake.longitude)) continue;
    weighted += quakeWeight(quake.magnitude);
  }

  if (weighted <= 0) return 0;

  const score = Math.log10(1 + weighted) / Math.log10(1 + RISK_SATURATION);
  return Math.max(0, Math.min(10000, Math.round(score * 10000)));
}

/** Count of qualifying quakes in a region, for logging and sanity checks. */
export function countQuakesInRegion(quakes: GeoNetQuake[], regionId: number): number {
  const region = NZ_REGIONS[regionId];
  return quakes.filter(
    (quake) =>
      quake.magnitude >= RISK_MIN_MAGNITUDE &&
      quake.latitude !== undefined &&
      quake.longitude !== undefined &&
      isInRegion(region, quake.latitude, quake.longitude)
  ).length;
}

/** Every region ID (matching the on-chain registry) whose real boundary contains the point. */
export function regionIdsForPoint(lat: number, lng: number): number[] {
  const ids: number[] = [];
  for (let i = 0; i < NZ_REGIONS.length; i++) {
    if (isInRegion(NZ_REGIONS[i], lat, lng)) ids.push(i);
  }
  return ids;
}
