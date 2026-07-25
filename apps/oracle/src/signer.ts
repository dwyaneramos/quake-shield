import { ethers } from "ethers";
import { env } from "./config.js";

const QUAKESHIELD_ABI = [
  "function recordEarthquake(uint256 magnitude, int256 latitude, int256 longitude, uint256 depth, string publicId) returns (uint256)",
  "function getQuakeCount() view returns (uint256)",
  "function recordedQuakes(uint256) view returns (uint256 magnitude, int256 latitude, int256 longitude, uint256 depth, uint256 timestamp, string publicId)",
  "event QuakeRecorded(uint256 indexed quakeId, uint256 magnitude, int256 lat, int256 lng)",
];

const EARTHQUAKE_MARKET_ABI = [
  "function resolveMarket(uint256 marketId, bool outcomeYes)",
  "function getMarket(uint256 marketId) view returns (string description, int256 centerLat, int256 centerLng, uint256 radiusKm, uint256 triggerMagnitude, uint256 resolutionTime, uint256 yesReserve, uint256 noReserve, uint256 usdcCollateral, bool resolved, bool outcomeYes)",
  "function getMarketCount() view returns (uint256)",
  "event MarketResolved(uint256 indexed marketId, bool outcomeYes)",
];

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let quakeShieldContract: ethers.Contract;
let marketContract: ethers.Contract | null;

export function initBlockchain(): void {
  provider = new ethers.JsonRpcProvider(env.POLYGON_AMOY_RPC);
  wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);
  quakeShieldContract = new ethers.Contract(env.QUAKE_SHIELD_ADDRESS, QUAKESHIELD_ABI, wallet);

  console.log("[Blockchain] Connected to Polygon Amoy");
  console.log("[Blockchain] Oracle address:", wallet.address);
  console.log("[Blockchain] QuakeShield:", env.QUAKE_SHIELD_ADDRESS);

  if (env.EARTHQUAKE_MARKET_ADDRESS) {
    marketContract = new ethers.Contract(env.EARTHQUAKE_MARKET_ADDRESS, EARTHQUAKE_MARKET_ABI, wallet);
    console.log("[Blockchain] EarthquakeMarket:", env.EARTHQUAKE_MARKET_ADDRESS);
  } else {
    marketContract = null;
    console.log("[Blockchain] EarthquakeMarket: not configured (set EARTHQUAKE_MARKET_ADDRESS)");
  }
}

export function getSignerAddress(): string {
  return wallet?.address || "";
}

export async function recordEarthquake(
  magnitudeScaled: bigint,
  latitudeScaled: bigint,
  longitudeScaled: bigint,
  depth: bigint,
  publicId: string
): Promise<ethers.TransactionReceipt | null> {
  try {
    console.log(`[Blockchain] Recording earthquake: ${publicId}`);

    const tx = await quakeShieldContract.recordEarthquake(
      magnitudeScaled, latitudeScaled, longitudeScaled, depth, publicId
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

export async function getQuakeCount(): Promise<number> {
  const count = await quakeShieldContract.getQuakeCount();
  return Number(count);
}

export async function isQuakeRecorded(publicId: string): Promise<boolean> {
  const count = await getQuakeCount();
  for (let i = 0; i < count; i++) {
    const quake = await quakeShieldContract.recordedQuakes(i);
    if (quake.publicId === publicId) return true;
  }
  return false;
}

export interface MarketInfo {
  description: string;
  centerLat: bigint;
  centerLng: bigint;
  radiusKm: bigint;
  triggerMagnitude: bigint;
  resolutionTime: bigint;
  yesReserve: bigint;
  noReserve: bigint;
  usdcCollateral: bigint;
  resolved: boolean;
  outcomeYes: boolean;
}

export async function getMarketCount(): Promise<number> {
  if (!marketContract) return 0;
  const count = await marketContract.getMarketCount();
  return Number(count);
}

export async function getMarket(marketId: number): Promise<MarketInfo | null> {
  if (!marketContract) return null;
  try {
    const data = await marketContract.getMarket(marketId);
    return {
      description: data[0] as string,
      centerLat: data[1] as bigint,
      centerLng: data[2] as bigint,
      radiusKm: data[3] as bigint,
      triggerMagnitude: data[4] as bigint,
      resolutionTime: data[5] as bigint,
      yesReserve: data[6] as bigint,
      noReserve: data[7] as bigint,
      usdcCollateral: data[8] as bigint,
      resolved: data[9] as boolean,
      outcomeYes: data[10] as boolean,
    };
  } catch (error) {
    console.error(`[Blockchain] Error fetching market ${marketId}:`, error);
    return null;
  }
}

export async function resolveMarketOnChain(
  marketId: number,
  outcomeYes: boolean
): Promise<ethers.TransactionReceipt | null> {
  if (!marketContract) {
    console.error("[Blockchain] EarthquakeMarket not configured, cannot resolve");
    return null;
  }
  try {
    console.log(`[Blockchain] Resolving market ${marketId} as ${outcomeYes ? "YES" : "NO"}`);
    const tx = await marketContract.resolveMarket(marketId, outcomeYes);
    console.log(`[Blockchain] Resolve tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[Blockchain] Resolve tx confirmed in block ${receipt.blockNumber}`);
    return receipt;
  } catch (error) {
    console.error(`[Blockchain] Error resolving market ${marketId}:`, error);
    throw error;
  }
}
