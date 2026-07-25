import { ethers } from "ethers";
import { env } from "./config.js";

// QuakeShield ABI (only the functions we need)
const QUAKESHIELD_ABI = [
  "function recordEarthquake(uint256 magnitude, int256 latitude, int256 longitude, uint256 depth, string publicId) returns (uint256)",
  "function getQuakeCount() view returns (uint256)",
  "function recordedQuakes(uint256) view returns (uint256 magnitude, int256 latitude, int256 longitude, uint256 depth, uint256 timestamp, string publicId)",
  "event QuakeRecorded(uint256 indexed quakeId, uint256 magnitude, int256 lat, int256 lng)",
];

// EarthquakeMarket ABI (only the functions the resolver needs)
const EARTHQUAKE_MARKET_ABI = [
  "function getMarketCount() view returns (uint256)",
  "function getMarket(uint256) view returns (tuple(string description, int256 centerLat, int256 centerLng, uint256 radiusKm, uint256 triggerMagnitude, uint256 createdAt, uint256 resolutionTime, uint256 yesReserve, uint256 noReserve, uint256 collateralBalance, bool resolved, bool outcomeYes))",
  "function resolveMarket(uint256 marketId, bool outcomeYes)",
];

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let contract: ethers.Contract;
let marketContract: ethers.Contract | null = null;

/**
 * Initialize blockchain connection
 */
export function initBlockchain(): ethers.Contract {
  provider = new ethers.JsonRpcProvider(env.RPC_URL);
  wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);
  contract = new ethers.Contract(env.QUAKE_SHIELD_ADDRESS, QUAKESHIELD_ABI, wallet);

  console.log(`[Blockchain] Connected to ${env.NETWORK_NAME}`);
  console.log("[Blockchain] Oracle address:", wallet.address);
  console.log("[Blockchain] Contract address:", env.QUAKE_SHIELD_ADDRESS);

  if (env.EARTHQUAKE_MARKET_ADDRESS) {
    marketContract = new ethers.Contract(env.EARTHQUAKE_MARKET_ADDRESS, EARTHQUAKE_MARKET_ABI, wallet);
    console.log("[Blockchain] EarthquakeMarket address:", env.EARTHQUAKE_MARKET_ADDRESS);
  } else {
    console.log("[Blockchain] EarthquakeMarket not configured for this network — skipping market resolution");
  }

  return contract;
}

/**
 * Get the current signer address
 */
export function getSignerAddress(): string {
  return wallet?.address || "";
}

/**
 * Record an earthquake on the smart contract
 */
export async function recordEarthquake(
  magnitudeScaled: bigint,
  latitudeScaled: bigint,
  longitudeScaled: bigint,
  depth: bigint,
  publicId: string
): Promise<ethers.TransactionReceipt | null> {
  try {
    console.log(`[Blockchain] Recording earthquake: ${publicId}`);
    console.log(`  Magnitude (scaled): ${magnitudeScaled}`);
    console.log(`  Lat (scaled): ${latitudeScaled}`);
    console.log(`  Lng (scaled): ${longitudeScaled}`);

    const tx = await contract.recordEarthquake(
      magnitudeScaled,
      latitudeScaled,
      longitudeScaled,
      depth,
      publicId
    );

    console.log(`[Blockchain] Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[Blockchain] Transaction confirmed in block ${receipt.blockNumber}`);

    return receipt;
  } catch (error) {
    console.error("[Blockchain] Error recording earthquake:", error);
    throw error;
  }
}

/**
 * Get the number of recorded quakes
 */
export async function getQuakeCount(): Promise<number> {
  const count = await contract.getQuakeCount();
  return Number(count);
}

/**
 * Check if a quake has already been recorded
 */
export async function isQuakeRecorded(publicId: string): Promise<boolean> {
  const count = await getQuakeCount();

  for (let i = 0; i < count; i++) {
    const quake = await contract.recordedQuakes(i);
    if (quake.publicId === publicId) {
      return true;
    }
  }

  return false;
}

export interface RecordedQuake {
  magnitude: bigint;
  latitude: bigint;
  longitude: bigint;
  timestamp: bigint;
}

/**
 * Fetch all quakes QuakeShield has recorded on this chain — the single
 * source of truth EarthquakeMarket resolution is checked against.
 */
export async function getRecordedQuakes(): Promise<RecordedQuake[]> {
  const count = await getQuakeCount();
  const quakes: RecordedQuake[] = [];

  for (let i = 0; i < count; i++) {
    const q = await contract.recordedQuakes(i);
    quakes.push({ magnitude: q.magnitude, latitude: q.latitude, longitude: q.longitude, timestamp: q.timestamp });
  }

  return quakes;
}

export interface OnChainMarket {
  id: number;
  centerLat: bigint;
  centerLng: bigint;
  radiusKm: bigint;
  triggerMagnitude: bigint;
  createdAt: bigint;
  resolutionTime: bigint;
}

/**
 * Fetch all not-yet-resolved EarthquakeMarket markets on this chain.
 * Returns an empty list if EarthquakeMarket isn't configured for this network.
 */
export async function getUnresolvedMarkets(): Promise<OnChainMarket[]> {
  if (!marketContract) return [];

  const count = Number(await marketContract.getMarketCount());
  const markets: OnChainMarket[] = [];

  for (let i = 0; i < count; i++) {
    const m = await marketContract.getMarket(i);
    if (m.resolved) continue;
    markets.push({
      id: i,
      centerLat: m.centerLat,
      centerLng: m.centerLng,
      radiusKm: m.radiusKm,
      triggerMagnitude: m.triggerMagnitude,
      createdAt: m.createdAt,
      resolutionTime: m.resolutionTime,
    });
  }

  return markets;
}

/**
 * Submit a market resolution. A YES claim is verified on-chain against
 * QuakeShield's recorded quakes; a NO claim only succeeds past resolutionTime.
 */
export async function submitMarketResolution(marketId: number, outcomeYes: boolean): Promise<void> {
  if (!marketContract) return;

  console.log(`[Blockchain] Resolving market ${marketId}: ${outcomeYes ? "YES" : "NO"}`);
  const tx = await marketContract.resolveMarket(marketId, outcomeYes);
  const receipt = await tx.wait();
  console.log(`[Blockchain] Market ${marketId} resolved in block ${receipt.blockNumber}`);
}
