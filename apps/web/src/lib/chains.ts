import { avalancheFuji, sepolia } from "viem/chains";

export const SUPPORTED_CHAINS = [sepolia, avalancheFuji] as const;

export const RPC_URLS: Record<number, string> = {
  // The default PublicNode endpoint rejects any eth_getLogs query reaching
  // back past its free-tier retention window ("Archive requests require a
  // personal token"), which breaks claims history lookups from deploy block.
  // drpc.org's public gateway serves full historical logs with no token.
  [sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_RPC || "https://sepolia.drpc.org",
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
