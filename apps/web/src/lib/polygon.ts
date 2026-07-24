// Polygon Amoy testnet configuration
export const POLYGON_AMOY = {
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://polygon-amoy-bor-rpc.publicnode.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Polygonscan Amoy",
      url: "https://amoy.polygonscan.com",
    },
  },
  testnet: true,
} as const;

// GeoNet API configuration
export const GEONET = {
  BASE_URL: "https://api.geonet.org.nz",
  QUAKE_ENDPOINT: "/quake",
  MMI_THRESHOLD: 4, // Minimum intensity to fetch
  POLL_INTERVAL_MS: 30_000,
} as const;

// NZ specific constants
export const NZ_BOUNDS = {
  north: -34.0,
  south: -48.0,
  east: 179.0,
  west: 165.0,
} as const;
