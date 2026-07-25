// Quake event from GeoNet API
export interface GeoNetQuake {
  publicID: string;
  time: string;
  depth: number;
  magnitude: number;
  locality: string;
  mmi: number;
  quality: "best" | "reviewed" | "automatic" | "preliminary" | "deleted";
  status?: string;
  // Lat/Lng from quake search or CAP feed
  latitude?: number;
  longitude?: number;
}

// Policy from smart contract
export interface Policy {
  id: bigint;
  policyholder: `0x${string}`;
  coverageAmount: bigint;
  premiumPaid: bigint;
  triggerMagnitude: bigint;
  centerLat: bigint;
  centerLng: bigint;
  radiusKm: bigint;
  isActive: boolean;
  hasPaidOut: boolean;
  createdAt: bigint;
  isRecurring: boolean;
  periodEnd: bigint;
}

// Formatted policy for UI display
export interface PolicyDisplay {
  id: number;
  coverageAmount: number;
  premiumPaid: number;
  triggerMagnitude: number;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  isActive: boolean;
  hasPaidOut: boolean;
  createdAt: Date;
}

// Pool statistics
export interface PoolStats {
  totalPremiums: bigint;
  totalPayouts: bigint;
  balance: bigint;
  activePolicies: bigint;
  totalActiveCoverage: bigint;
  totalInvested: bigint;
  yieldReserve: bigint;
}

// An investable NZ region from the contract's region registry
export interface Region {
  id: number;
  name: string;
  south: bigint; // Scaled by 1e6
  north: bigint;
  west: bigint;
  east: bigint;
  totalAssets: bigint;
  totalShares: bigint;
  epoch: bigint;
  riskScoreBps: bigint;
  riskUpdatedAt: bigint;
  lastAccrualAt: bigint;
  lastQuakeAt: bigint;
  quakeCount: bigint;
  totalInterestPaid: bigint;
  totalLosses: bigint;
  active: boolean;
  /** Derived from riskScoreBps by the contract — the return this region pays. */
  aprBps: bigint;
}

// An investor's stake in one region
export interface InvestmentPosition {
  regionId: number;
  shares: bigint;
  value: bigint;
}

// Earthquake event from contract
export interface QuakeEvent {
  magnitude: bigint;
  latitude: bigint;
  longitude: bigint;
  depth: bigint;
  timestamp: bigint;
  publicId: string;
}

// Earthquake statistics from GeoNet
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

// Scaled value helpers
export const SCALE = {
  /**
   * Convert human magnitude to contract magnitude (scaled by 100)
   * Example: 6.0 -> 600n
   */
  toMagnitude: (human: number): bigint => BigInt(Math.round(human * 100)),

  /**
   * Convert contract magnitude to human magnitude
   * Example: 600n -> 6.0
   */
  fromMagnitude: (scaled: bigint): number => Number(scaled) / 100,

  /**
   * Convert human lat/lng to contract lat/lng (scaled by 1e6)
   * Example: -41.2858 -> -41285800n
   */
  toLatLng: (human: number): bigint => BigInt(Math.round(human * 1_000_000)),

  /**
   * Convert contract lat/lng to human lat/lng
   * Example: -41285800n -> -41.2858
   */
  fromLatLng: (scaled: bigint): number => Number(scaled) / 1_000_000,

  /**
   * Convert DNZD amount (human) to contract amount (6 decimals)
   * Example: 1000 -> 1000000000n
   */
  toDNZD: (human: number): bigint => BigInt(Math.round(human * 1_000_000)),

  /**
   * Convert contract DNZD amount to human amount
   * Example: 1000000000n -> 1000
   */
  fromDNZD: (scaled: bigint): number => Number(scaled) / 1_000_000,

  /**
   * Convert a basis-point rate to a human percentage.
   * Example: 1700n -> 17
   */
  fromBps: (scaled: bigint): number => Number(scaled) / 100,
};
