import { env } from "./config.js";
import {
  GEONET_WFS_BASE_URL,
  GEONET_REST_BASE_URL,
  type GeoNetQuake,
  type BoundingBox,
  type WFSQuery,
  type MarketCriteria as MarketCriteriaType,
  type MarketResolution,
} from "@quakeshield/shared";

export type MarketCriteria = MarketCriteriaType;

// Re-export the shared type for convenience
export type { GeoNetQuake } from "@quakeshield/shared";

// ============ REST API ============

/**
 * Fetch recent earthquakes from GeoNet REST API
 */
export async function fetchRecentQuakes(mmi: number = -1): Promise<GeoNetQuake[]> {
  const url = `${env.GEONET_API_URL || GEONET_REST_BASE_URL}/quake?MMI=${mmi}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.geo+json;version=2",
    },
  });

  if (!response.ok) {
    throw new Error(`GeoNet API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  return (data.features || []).map((feature: any) => ({
    publicID: feature.properties.publicID,
    time: feature.properties.time,
    depth: feature.properties.depth,
    magnitude: feature.properties.magnitude,
    locality: feature.properties.locality,
    mmi: feature.properties.mmi,
    quality: feature.properties.quality as GeoNetQuake["quality"],
    latitude: feature.geometry?.coordinates?.[1],
    longitude: feature.geometry?.coordinates?.[0],
  }));
}

// ============ WFS API ============

function buildCQLFilter(query: WFSQuery): string {
  const parts: string[] = [];

  if (query.bbox) {
    const { west, south, east, north } = query.bbox;
    parts.push(`BBOX(origin_geom,${west},${south},${east},${north})`);
  }

  if (query.startTime) {
    parts.push(`origintime>='${query.startTime}'`);
  }

  if (query.endTime) {
    parts.push(`origintime<'${query.endTime}'`);
  }

  if (query.minMagnitude !== undefined) {
    parts.push(`magnitude>=${query.minMagnitude}`);
  }

  if (query.maxMagnitude !== undefined) {
    parts.push(`magnitude<=${query.maxMagnitude}`);
  }

  return parts.join("+AND+");
}

/**
 * Fetch earthquakes from GeoNet WFS with advanced filtering (bbox, time, magnitude)
 */
export async function fetchWFSQuakes(query: WFSQuery): Promise<GeoNetQuake[]> {
  const cql = buildCQLFilter(query);
  const maxFeatures = query.maxResults ?? 1000;

  const params = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName: "geonet:quake_search_v1",
    maxFeatures: String(maxFeatures),
    outputFormat: "json",
  });

  if (cql) {
    params.set("cql_filter", cql);
  }

  const url = `${GEONET_WFS_BASE_URL}?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GeoNet WFS error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  const features = data.features ?? [];

  return features.map((feature: any) => ({
    publicID: feature.properties?.publicid ?? feature.properties?.publicID ?? "",
    time: feature.properties?.origintime ?? feature.properties?.time ?? "",
    depth: feature.properties?.depth ?? 0,
    magnitude: feature.properties?.magnitude ?? 0,
    locality: feature.properties?.locality ?? "",
    mmi: feature.properties?.mmi ?? 0,
    quality: (feature.properties?.quality ?? "automatic") as GeoNetQuake["quality"],
    latitude: feature.geometry?.coordinates?.[1],
    longitude: feature.geometry?.coordinates?.[0],
  }));
}

// ============ Market Resolution ============

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function quakeMatchesCriteria(quake: GeoNetQuake, criteria: MarketCriteriaType): boolean {
  if (quake.magnitude < criteria.minMagnitude) return false;
  if (quake.latitude === undefined || quake.longitude === undefined) return false;

  const distance = haversineDistanceKm(
    criteria.centerLat,
    criteria.centerLng,
    quake.latitude,
    quake.longitude,
  );

  return distance <= criteria.radiusKm;
}

/**
 * Check if any earthquake in the given time window matches the market's criteria.
 * Returns the resolution outcome for the prediction market.
 */
export async function resolveMarket(criteria: MarketCriteriaType): Promise<MarketResolution> {
  const bbox: BoundingBox = {
    west: criteria.centerLng - criteria.radiusKm / 83,
    east: criteria.centerLng + criteria.radiusKm / 83,
    south: criteria.centerLat - criteria.radiusKm / 111,
    north: criteria.centerLat + criteria.radiusKm / 111,
  };

  const quakes = await fetchWFSQuakes({
    bbox,
    startTime: criteria.startTime,
    endTime: criteria.endTime,
    minMagnitude: criteria.minMagnitude,
    maxResults: 100,
  });

  const qualifyingQuake = quakes.find((q) => quakeMatchesCriteria(q, criteria));

  return {
    resolved: true,
    outcome: !!qualifyingQuake,
    qualifyingQuake,
    checkedAt: new Date().toISOString(),
  };
}

// ============ Value Conversion ============

/**
 * Convert GeoNet magnitude to contract magnitude (scaled by 100)
 */
export function magnitudeToScaled(magnitude: number): bigint {
  return BigInt(Math.round(magnitude * 100));
}

/**
 * Convert GeoNet lat/lng to contract lat/lng (scaled by 1e6)
 */
export function latLngToScaled(value: number): bigint {
  return BigInt(Math.round(value * 1_000_000));
}
