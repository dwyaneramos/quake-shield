import { avalancheFuji, sepolia } from "viem/chains";

export const SUPPORTED_CHAINS = [sepolia, avalancheFuji] as const;

export const RPC_URLS: Record<number, string> = {
  [sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_RPC || sepolia.rpcUrls.default.http[0],
  [avalancheFuji.id]: process.env.NEXT_PUBLIC_FUJI_RPC || avalancheFuji.rpcUrls.default.http[0],
};

export function getExplorerUrl(chainId: number | undefined): string {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId)?.blockExplorers?.default.url ?? "";
}

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
