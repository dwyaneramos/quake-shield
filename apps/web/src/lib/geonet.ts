import { GEONET } from "@/lib/polygon";
import type { GeoNetQuake } from "@/types";

/**
 * Fetch recent earthquakes from GeoNet API
 * Endpoint: GET /quake?MMI={threshold}
 */
export async function fetchRecentQuakes(mmi: number = GEONET.MMI_THRESHOLD): Promise<GeoNetQuake[]> {
  const response = await fetch(`${GEONET.BASE_URL}/quake?MMI=${mmi}`, {
    headers: {
      Accept: "application/vnd.geo+json;version=2",
    },
    next: { revalidate: 30 }, // Cache for 30 seconds
  });

  if (!response.ok) {
    throw new Error(`GeoNet API error: ${response.status}`);
  }

  const data = await response.json();

  // GeoNet returns GeoJSON FeatureCollection
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
 * Fetch a single earthquake by publicID
 */
export async function fetchQuakeById(publicID: string): Promise<GeoNetQuake> {
  const response = await fetch(`${GEONET.BASE_URL}/quake/${publicID}`, {
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
    quality: feature.properties.quality,
    latitude: feature.geometry?.coordinates?.[1],
    longitude: feature.geometry?.coordinates?.[0],
  };
}
