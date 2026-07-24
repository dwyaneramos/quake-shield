import { env } from "./config.js";

export interface GeoNetQuake {
  publicID: string;
  time: string;
  depth: number;
  magnitude: number;
  locality: string;
  mmi: number;
  quality: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Fetch recent earthquakes from GeoNet API
 */
export async function fetchRecentQuakes(mmi: number = 4): Promise<GeoNetQuake[]> {
  const url = `${env.GEONET_API_URL}/quake?MMI=${mmi}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.geo+json;version=2",
    },
  });

  if (!response.ok) {
    throw new Error(`GeoNet API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return (data.features || []).map((feature: any) => ({
    publicID: feature.properties.publicID,
    time: feature.properties.time,
    depth: feature.properties.depth,
    magnitude: feature.properties.magnitude,
    locality: feature.properties.locality,
    mmi: feature.properties.mmi,
    quality: feature.properties.quality,
    latitude: feature.geometry?.coordinates?.[1],
    longitude: feature.geometry?.coordinates?.[0],
  }));
}

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
