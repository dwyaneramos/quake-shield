import { env } from "./config.js";

export const GEONET_WFS_BASE_URL = "https://wfs.geonet.org.nz/geonet/ows";
export const GEONET_REST_BASE_URL = "https://api.geonet.org.nz";

interface GeoNetQuake {
  publicID: string;
  time: string;
  depth: number;
  magnitude: number;
  locality: string;
  mmi: number;
  quality: "best" | "reviewed" | "automatic" | "preliminary" | "deleted";
  latitude?: number;
  longitude?: number;
}

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface WFSQuery {
  bbox?: BoundingBox;
  startTime?: string;
  endTime?: string;
  minMagnitude?: number;
  maxMagnitude?: number;
  maxResults?: number;
}

export type { GeoNetQuake };

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

  return parts.join(" AND ");
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
