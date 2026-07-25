import { GEONET } from "@/lib/polygon";
import type { GeoNetQuake } from "@/types";
import {
  fetchRecentQuakesREST,
  fetchQuakeById as fetchQuakeByIdWFS,
  fetchWFSQuakes,
  fetchQuakeStats as fetchQuakeStatsWFS,
  resolveMarket as resolveMarketWFS,
  type BoundingBox,
  type WFSQuery,
  type MarketCriteria,
  type MarketResolution,
  type QuakeStats,
} from "@quakeshield/shared";

/**
 * Fetch recent earthquakes from GeoNet REST API (legacy wrapper)
 */
export async function fetchRecentQuakes(mmi: number = GEONET.MMI_THRESHOLD): Promise<GeoNetQuake[]> {
  return fetchRecentQuakesREST(mmi);
}

/**
 * Fetch a single earthquake by publicID
 */
export async function fetchQuakeById(publicID: string): Promise<GeoNetQuake> {
  return fetchQuakeByIdWFS(publicID);
}

/**
 * Fetch earthquakes via WFS with advanced filtering
 */
export async function fetchQuakesByRegion(query: WFSQuery): Promise<GeoNetQuake[]> {
  return fetchWFSQuakes(query);
}

/**
 * Fetch GeoNet earthquake statistics (7/28/365-day counts + daily rate)
 */
export async function fetchQuakeStats(): Promise<QuakeStats> {
  return fetchQuakeStatsWFS();
}

/**
 * Resolve a prediction market against live GeoNet data
 */
export async function checkMarketResolution(criteria: MarketCriteria): Promise<MarketResolution> {
  return resolveMarketWFS(criteria);
}

/**
 * Build a bounding box from center point + radius in km
 */
export function bboxFromRadius(centerLat: number, centerLng: number, radiusKm: number): BoundingBox {
  return {
    west: centerLng - radiusKm / 83,
    east: centerLng + radiusKm / 83,
    south: centerLat - radiusKm / 111,
    north: centerLat + radiusKm / 111,
  };
}
