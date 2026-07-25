import { haversineDistanceKm } from "@quakeshield/shared";
import { NZ_CITIES } from "@/lib/cities";

export interface NZRegion {
  id: string;
  name: string;
  /** Approximate outline of the regional council area, as [lat, lng] pairs. */
  boundary: [number, number][];
}

/**
 * Simplified outlines of the NZ regional council areas that our covered
 * cities fall in. These are approximations for visualization only, not
 * survey-grade boundaries.
 */
export const NZ_REGIONS: NZRegion[] = [
  {
    id: "auckland",
    name: "Auckland Region",
    boundary: [
      [-36.2, 174.75],
      [-36.35, 174.85],
      [-36.62, 174.9],
      [-36.79, 175.15],
      [-36.95, 174.95],
      [-37.05, 174.75],
      [-37.26, 174.9],
      [-37.24, 174.65],
      [-37.05, 174.55],
      [-36.85, 174.42],
      [-36.6, 174.3],
      [-36.35, 174.35],
      [-36.2, 174.5],
    ],
  },
  {
    id: "waikato",
    name: "Waikato Region",
    boundary: [
      [-36.8, 174.45],
      [-37.0, 175.3],
      [-36.95, 175.75],
      [-37.3, 175.85],
      [-37.55, 175.65],
      [-38.05, 175.5],
      [-38.55, 175.75],
      [-38.85, 175.9],
      [-39.05, 175.6],
      [-38.7, 175.3],
      [-38.3, 175.15],
      [-37.9, 175.05],
      [-37.55, 174.85],
      [-37.3, 174.7],
      [-37.0, 174.55],
    ],
  },
  {
    id: "bayofplenty",
    name: "Bay of Plenty Region",
    boundary: [
      [-37.55, 175.9],
      [-37.6, 176.2],
      [-37.65, 176.5],
      [-37.85, 176.9],
      [-38.0, 177.15],
      [-38.2, 177.3],
      [-38.35, 177.1],
      [-38.3, 176.75],
      [-38.2, 176.45],
      [-38.1, 176.2],
      [-37.95, 175.95],
      [-37.75, 175.8],
    ],
  },
  {
    id: "hawkesbay",
    name: "Hawke's Bay Region",
    boundary: [
      [-38.6, 177.55],
      [-38.85, 177.9],
      [-39.1, 177.85],
      [-39.3, 177.55],
      [-39.5, 177.35],
      [-39.55, 177.1],
      [-39.75, 176.9],
      [-40.05, 176.6],
      [-40.15, 176.3],
      [-39.9, 176.1],
      [-39.55, 176.1],
      [-39.2, 176.25],
      [-38.9, 176.45],
      [-38.65, 176.8],
      [-38.55, 177.15],
    ],
  },
  {
    id: "taranaki",
    name: "Taranaki Region",
    boundary: [
      [-39.0, 173.85],
      [-38.85, 174.05],
      [-38.75, 174.25],
      [-38.85, 174.45],
      [-39.05, 174.55],
      [-39.3, 174.5],
      [-39.55, 174.35],
      [-39.6, 174.1],
      [-39.45, 173.9],
      [-39.2, 173.8],
    ],
  },
  {
    id: "manawatuwhanganui",
    name: "Manawatū-Whanganui Region",
    boundary: [
      [-38.8, 175.2],
      [-38.9, 175.55],
      [-38.85, 175.85],
      [-39.1, 175.9],
      [-39.4, 175.75],
      [-39.7, 175.6],
      [-40.1, 175.55],
      [-40.35, 175.65],
      [-40.35, 175.35],
      [-40.1, 175.1],
      [-39.8, 174.9],
      [-39.55, 174.75],
      [-39.25, 174.85],
      [-39.0, 175.0],
    ],
  },
  {
    id: "wellington",
    name: "Wellington Region",
    boundary: [
      [-41.4271501, 174.3880382],
      [-41.4694321, 174.4128758],
      [-41.519652, 174.5188467],
      [-41.67828, 174.9824984],
      [-41.792821, 175.1184748],
      [-41.8150277, 175.2689534],
      [-41.7967554, 175.4191893],
      [-41.7417092, 175.5763893],
      [-41.6477702, 175.7566982],
      [-41.534507, 175.9866128],
      [-41.4194536, 176.1096449],
      [-41.2779777, 176.2931979],
      [-41.0000668, 176.4613745],
      [-40.8568973, 176.522],
      [-40.8109539, 176.5645611],
      [-40.6977298, 176.3323953],
      [-40.6751345, 176.0938498],
      [-40.7228804, 175.9740097],
      [-40.7680906, 175.7647392],
      [-40.6965624, 175.6906501],
      [-40.6933971, 175.4734436],
      [-40.7686714, 175.2671873],
      [-40.633423, 174.8316285],
      [-40.8011271, 174.6229044],
      [-41.21572, 174.5147851],
    ],
  },
  {
    id: "nelson",
    name: "Nelson Region",
    boundary: [
      [-41.15, 173.1],
      [-41.1, 173.25],
      [-41.15, 173.35],
      [-41.25, 173.32],
      [-41.35, 173.2],
      [-41.35, 173.05],
      [-41.25, 172.98],
    ],
  },
  {
    id: "canterbury",
    name: "Canterbury Region",
    boundary: [
      [-42.35, 173.55],
      [-42.55, 173.85],
      [-42.9, 172.9],
      [-43.3, 172.75],
      [-43.6, 172.6],
      [-43.95, 171.85],
      [-44.3, 171.25],
      [-44.35, 170.95],
      [-44.05, 170.85],
      [-43.6, 171.2],
      [-43.2, 171.8],
      [-42.85, 172.3],
      [-42.55, 172.9],
    ],
  },
  {
    id: "otago",
    name: "Otago Region",
    boundary: [
      [-44.35, 170.95],
      [-44.3, 171.25],
      [-44.65, 171.2],
      [-45.0, 170.75],
      [-45.35, 170.55],
      [-45.75, 170.65],
      [-45.9, 170.45],
      [-45.85, 169.85],
      [-45.55, 169.15],
      [-45.15, 168.6],
      [-44.75, 168.75],
      [-44.55, 169.15],
      [-44.45, 169.65],
      [-44.35, 170.1],
    ],
  },
];

/** Maps an NZ_CITIES id to the NZ_REGIONS id it falls within. */
const CITY_TO_REGION: Record<string, string> = {
  auckland: "auckland",
  wellington: "wellington",
  christchurch: "canterbury",
  hamilton: "waikato",
  tauranga: "bayofplenty",
  napier: "hawkesbay",
  newplymouth: "taranaki",
  palmerston: "manawatuwhanganui",
  nelson: "nelson",
  dunedin: "otago",
  queenstown: "otago",
  rotorua: "bayofplenty",
};

export function getRegionById(id: string): NZRegion | undefined {
  return NZ_REGIONS.find((r) => r.id === id);
}

export function getRegionForCity(cityId: string): NZRegion | undefined {
  const regionId = CITY_TO_REGION[cityId];
  return regionId ? getRegionById(regionId) : undefined;
}

/** For a custom pinpoint, find the region of the nearest covered city. */
export function getNearestRegion(lat: number, lng: number): NZRegion | undefined {
  let nearestCityId: string | null = null;
  let nearestDistance = Infinity;
  for (const city of NZ_CITIES) {
    const distance = haversineDistanceKm(lat, lng, city.lat, city.lng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestCityId = city.id;
    }
  }
  return nearestCityId ? getRegionForCity(nearestCityId) : undefined;
}
