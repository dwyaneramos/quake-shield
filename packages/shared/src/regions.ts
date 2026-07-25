import regionData from "./regions.json";
import boundaryData from "./region-boundaries.json";

/**
 * The 16 New Zealand regions, with real coastline-following boundaries.
 *
 * These are the investable regions in QuakeShield: investors back a region's
 * share of the insurance pool, and a quake is attributed to a region when its
 * epicenter falls inside that region's boundary polygon.
 *
 * Boundaries are sourced from OpenStreetMap's regional-council administrative
 * relations (simplified for a reasonable payload/render cost), not a hand-drawn
 * approximation — `isInRegion` does real point-in-polygon containment against
 * them. `south/north/west/east` are still carried as each polygon's bounding
 * box, used as a cheap pre-filter and for map-fit/centering; they are not
 * themselves the containment test.
 *
 * Solidity can't cheaply do point-in-polygon, so the contract no longer
 * computes region membership on-chain — it trusts the oracle-supplied list of
 * region IDs a quake's epicenter fell inside (the oracle computes this with
 * the exact same `isInRegion` below), the same way it already trusts the
 * oracle for the quake's magnitude and location in the first place.
 *
 * The tables live in `regions.json` / `region-boundaries.json` so the Hardhat
 * deploy script — which runs as CommonJS and seeds region names onto the
 * contract — can read the same source of truth this ESM module does.
 */
export interface NZRegion {
  /** Stable slug used in URLs and API queries. */
  id: string;
  /** Display name, also stored on-chain as the region's name. */
  name: string;
  island: "North Island" | "South Island";
  /** Southern (minimum) latitude of the boundary's bounding box, degrees. */
  south: number;
  /** Northern (maximum) latitude of the boundary's bounding box, degrees. */
  north: number;
  /** Western (minimum) longitude of the boundary's bounding box, degrees. */
  west: number;
  /** Eastern (maximum) longitude of the boundary's bounding box, degrees. */
  east: number;
  /** Boundary polygon as [lat, lng] pairs, outer ring only (no holes). */
  boundary: [number, number][];
}

const boundariesById = boundaryData as unknown as Record<string, [number, number][]>;

export const NZ_REGIONS: NZRegion[] = (regionData as Omit<NZRegion, "boundary">[]).map((region) => ({
  ...region,
  boundary: boundariesById[region.id] ?? [],
}));

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

function isInBoundingBox(region: NZRegion, lat: number, lng: number): boolean {
  return lat >= region.south && lat <= region.north && lng >= region.west && lng <= region.east;
}

/**
 * Ray-casting point-in-polygon test (even-odd rule) against a single ring.
 * Standard algorithm: cast a ray east from the point and count how many
 * edges it crosses — odd means inside.
 */
function isInRing(ring: [number, number][], lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    const crosses = latI > lat !== latJ > lat;
    if (!crosses) continue;
    const lngAtLat = lngI + ((lat - latI) * (lngJ - lngI)) / (latJ - latI);
    if (lng < lngAtLat) inside = !inside;
  }
  return inside;
}

/**
 * Whether a point falls inside a region's real boundary. The bounding-box
 * check is a cheap reject before the more expensive ring test.
 */
export function isInRegion(region: NZRegion, lat: number, lng: number): boolean {
  if (!isInBoundingBox(region, lat, lng)) return false;
  if (region.boundary.length === 0) return false;
  return isInRing(region.boundary, lat, lng);
}

/** Every region containing the point — usually one, occasionally none. */
export function regionsForPoint(lat: number, lng: number): NZRegion[] {
  return NZ_REGIONS.filter((region) => isInRegion(region, lat, lng));
}

/** Centre of a region's bounding box, for map pins and distance-free display. */
export function regionCenter(region: NZRegion): { lat: number; lng: number } {
  return {
    lat: (region.south + region.north) / 2,
    lng: (region.west + region.east) / 2,
  };
}
