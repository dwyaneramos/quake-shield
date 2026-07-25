export const GEONET_WFS_BASE_URL = "https://wfs.geonet.org.nz/geonet/ows";
export const GEONET_REST_BASE_URL = "https://api.geonet.org.nz";

// ============ Types ============

export interface GeoNetQuake {
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

// ============ CQL Filter Builder ============

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

// ============ WFS Client ============

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

// ============ REST API Client ============

export async function fetchRecentQuakesREST(
  mmi: number = -1,
): Promise<GeoNetQuake[]> {
  const response = await fetch(`${GEONET_REST_BASE_URL}/quake?MMI=${mmi}`, {
    headers: {
      Accept: "application/vnd.geo+json;version=2",
    },
  });

  if (!response.ok) {
    throw new Error(`GeoNet API error: ${response.status}`);
  }

  const data = await response.json();

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

export async function fetchQuakeById(publicID: string): Promise<GeoNetQuake> {
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

// ============ Market Resolution ============

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

export function quakeMatchesCriteria(
  quake: GeoNetQuake,
  criteria: MarketCriteria,
): boolean {
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

  const qualifyingQuake = quakes.find((q) => quakeMatchesCriteria(q, criteria));

  return {
    resolved: true,
    outcome: !!qualifyingQuake,
    qualifyingQuake,
    checkedAt: new Date().toISOString(),
  };
}

// ============ NZ Region Constants ============

export const NZ_BOUNDS: BoundingBox = {
  north: -34.0,
  south: -48.0,
  east: 179.0,
  west: 165.0,
};

export const NZ_REGIONS: Record<string, { lat: number; lng: number }> = {
  "Wellington": { lat: -41.2858, lng: 174.778 },
  "Auckland": { lat: -36.8485, lng: 174.7633 },
  "Christchurch": { lat: -43.53, lng: 172.636 },
  "Queenstown": { lat: -45.0312, lng: 168.6626 },
  "Napier": { lat: -39.4928, lng: 176.912 },
  "Dunedin": { lat: -45.8788, lng: 170.5028 },
};
