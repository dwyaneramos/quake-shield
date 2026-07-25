import regionData from "./regions.json";

/**
 * The 16 New Zealand regions, as axis-aligned bounding boxes.
 *
 * These are the investable regions in QuakeShield: investors back a region's
 * share of the insurance pool, and a quake is attributed to a region when its
 * epicenter falls inside that region's box.
 *
 * Boxes are a deliberate simplification of the real (very irregular) regional
 * boundaries — Solidity can't cheaply do point-in-polygon, and the on-chain
 * contract must agree exactly with what the oracle and the UI compute. They're
 * drawn to be near-disjoint, so most epicenters land in exactly one region; a
 * quake on a shared edge is attributed to every region that contains it, and a
 * quake outside every box (deep ocean, the Chathams) is attributed to none and
 * charged across the whole pool instead.
 *
 * The table itself lives in `regions.json` so the Hardhat deploy script — which
 * runs as CommonJS and seeds these onto the contract — can read the same source
 * of truth this ESM module does.
 */
export interface NZRegion {
  /** Stable slug used in URLs and API queries. */
  id: string;
  /** Display name, also stored on-chain as the region's name. */
  name: string;
  island: "North Island" | "South Island";
  /** Southern (minimum) latitude, degrees. */
  south: number;
  /** Northern (maximum) latitude, degrees. */
  north: number;
  /** Western (minimum) longitude, degrees. */
  west: number;
  /** Eastern (maximum) longitude, degrees. */
  east: number;
}

export const NZ_REGIONS: NZRegion[] = regionData as NZRegion[];

export function getRegionById(id: string): NZRegion | undefined {
  return NZ_REGIONS.find((region) => region.id === id);
}

export function getRegionByName(name: string): NZRegion | undefined {
  return NZ_REGIONS.find((region) => region.name === name);
}

/** Index into NZ_REGIONS, which is also the region's on-chain ID. */
export function getRegionIndexByName(name: string): number {
  return NZ_REGIONS.findIndex((region) => region.name === name);
}

/**
 * Whether a point falls inside a region's box. Mirrors the contract's
 * `_isInRegion` exactly (inclusive on all four edges).
 */
export function isInRegion(region: NZRegion, lat: number, lng: number): boolean {
  return lat >= region.south && lat <= region.north && lng >= region.west && lng <= region.east;
}

/** Every region containing the point — usually one, occasionally none. */
export function regionsForPoint(lat: number, lng: number): NZRegion[] {
  return NZ_REGIONS.filter((region) => isInRegion(region, lat, lng));
}

/** Centre of a region's box, for map pins and distance-free display. */
export function regionCenter(region: NZRegion): { lat: number; lng: number } {
  return {
    lat: (region.south + region.north) / 2,
    lng: (region.west + region.east) / 2,
  };
}
