export interface NZCity {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}

export const NZ_CITIES: NZCity[] = [
  { id: "auckland", name: "Auckland", lat: -36.8485, lng: 174.7633, region: "North Island" },
  { id: "wellington", name: "Wellington", lat: -41.2865, lng: 174.7762, region: "North Island" },
  { id: "christchurch", name: "Christchurch", lat: -43.5321, lng: 172.6362, region: "South Island" },
  { id: "hamilton", name: "Hamilton", lat: -37.7870, lng: 175.2793, region: "North Island" },
  { id: "tauranga", name: "Tauranga", lat: -37.6878, lng: 176.1651, region: "North Island" },
  { id: "napier", name: "Napier", lat: -39.4928, lng: 176.9120, region: "North Island" },
  { id: "newplymouth", name: "New Plymouth", lat: -39.0556, lng: 174.0752, region: "North Island" },
  { id: "palmerston", name: "Palmerston North", lat: -40.3523, lng: 175.6082, region: "North Island" },
  { id: "nelson", name: "Nelson", lat: -41.2706, lng: 173.2840, region: "South Island" },
  { id: "dunedin", name: "Dunedin", lat: -45.8788, lng: 170.5028, region: "South Island" },
  { id: "queenstown", name: "Queenstown", lat: -45.0312, lng: 168.6626, region: "South Island" },
  { id: "rotorua", name: "Rotorua", lat: -38.1368, lng: 176.2497, region: "North Island" },
];

export const CITY_RADIUS_KM = 150;

export function getCityById(id: string): NZCity | undefined {
  return NZ_CITIES.find((c) => c.id === id);
}
