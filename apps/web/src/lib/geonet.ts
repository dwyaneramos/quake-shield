import { GEONET } from "@/lib/chains";
import type { GeoNetQuake } from "@/types";

const GEONET_WFS_BASE_URL = "https://wfs.geonet.org.nz/geonet/ows";
const GEONET_REST_BASE_URL = "https://api.geonet.org.nz";

const quakeCache = new Map<string, { data: GeoNetQuake[]; ts: number }>();
const CACHE_TTL_MS = 60_000;

function getCached<T>(key: string): T | null {
  const entry = quakeCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data as T;
  return null;
}

function setCache(key: string, data: GeoNetQuake[]): void {
  quakeCache.set(key, { data, ts: Date.now() });
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

export interface MarketCriteria {
  minMagnitude: number;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  startTime: string;
  endTime: string;
}

export interface MarketResolution {
  resolved: boolean;
  outcome: boolean;
  qualifyingQuake?: GeoNetQuake;
  checkedAt: string;
}

export interface QuakeStats {
  magnitudeCount: {
    last7Days: { magnitude: number; count: number }[];
    last28Days: { magnitude: number; count: number }[];
    last365Days: { magnitude: number; count: number }[];
  };
  rate: {
    perDay: { magnitude: number; count: number }[];
  };
}

function escapeCQL(value: string): string {
  return value.replace(/'/g, "''");
}

function buildCQLFilter(query: WFSQuery): string {
  const parts: string[] = [];

  if (query.bbox) {
    const { west, south, east, north } = query.bbox;
    parts.push(`BBOX(origin_geom,${west},${south},${east},${north})`);
  }

  if (query.startTime) {
    parts.push(`origintime>='${escapeCQL(query.startTime)}'`);
  }

  if (query.endTime) {
    parts.push(`origintime<'${escapeCQL(query.endTime)}'`);
  }

  if (query.minMagnitude !== undefined) {
    parts.push(`magnitude>=${query.minMagnitude}`);
  }

  if (query.maxMagnitude !== undefined) {
    parts.push(`magnitude<=${query.maxMagnitude}`);
  }

  return parts.join("+AND+");
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
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

export async function fetchRecentQuakesREST(
  mmi: number = -1,
): Promise<GeoNetQuake[]> {
  const cacheKey = `rest:${mmi}`;
  const cached = getCached<GeoNetQuake[]>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${GEONET_REST_BASE_URL}/quake?MMI=${mmi}`, {
    headers: {
      Accept: "application/vnd.geo+json;version=2",
    },
  });

  if (!response.ok) {
    throw new Error(`GeoNet API error: ${response.status}`);
  }

  const data = await response.json();

  const quakes = (data.features || []).map((feature: any) => ({
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

  setCache(cacheKey, quakes);
  return quakes;
}

export async function fetchQuakeByIdWFS(publicID: string): Promise<GeoNetQuake> {
  const response = await fetch(`${GEONET_REST_BASE_URL}/quake/${publicID}`, {
    headers: {
      Accept: "application/vnd.geo+json;version=2",
    },
  });

  if (!response.ok) {
    throw new Error(`GeoNet API error: ${response.status}`);
  }

  const data = await response.json();
  const feature = data.features?.[0];

  if (!feature) {
    throw new Error(`Quake not found: ${publicID}`);
  }

  return {
    publicID: feature.properties.publicID,
    time: feature.properties.time,
    depth: feature.properties.depth,
    magnitude: feature.properties.magnitude,
    locality: feature.properties.locality,
    mmi: feature.properties.mmi,
    quality: feature.properties.quality as GeoNetQuake["quality"],
    latitude: feature.geometry?.coordinates?.[1],
    longitude: feature.geometry?.coordinates?.[0],
  };
}

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

  const data = await response.json();
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

export async function fetchQuakeStats(): Promise<QuakeStats> {
  const response = await fetch(`${GEONET_REST_BASE_URL}/quake/stats`, {
    headers: {
      Accept: "application/json;version=2",
    },
  });

  if (!response.ok) {
    throw new Error(`GeoNet stats error: ${response.status}`);
  }

  return response.json();
}

export async function resolveMarket(
  criteria: MarketCriteria,
): Promise<MarketResolution> {
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

  const qualifyingQuake = quakes.find((q) => {
    if (q.magnitude < criteria.minMagnitude) return false;
    if (q.latitude === undefined || q.longitude === undefined) return false;
    const distance = haversineDistanceKm(
      criteria.centerLat,
      criteria.centerLng,
      q.latitude,
      q.longitude,
    );
    return distance <= criteria.radiusKm;
  });

  return {
    resolved: true,
    outcome: !!qualifyingQuake,
    qualifyingQuake,
    checkedAt: new Date().toISOString(),
  };
}

export function fetchRecentQuakes(mmi: number = GEONET.MMI_THRESHOLD): Promise<GeoNetQuake[]> {
  return fetchRecentQuakesREST(mmi);
}

export function bboxFromRadius(centerLat: number, centerLng: number, radiusKm: number): BoundingBox {
  return {
    west: centerLng - radiusKm / 83,
    east: centerLng + radiusKm / 83,
    south: centerLat - radiusKm / 111,
    north: centerLat + radiusKm / 111,
  };
}

export function fetchQuakesByRegion(query: WFSQuery): Promise<GeoNetQuake[]> {
  return fetchWFSQuakes(query);
}
