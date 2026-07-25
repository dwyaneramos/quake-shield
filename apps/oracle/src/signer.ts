import { ethers } from "ethers";
import { env } from "./config.js";
import type { RegionBounds } from "./risk.js";

const QUAKESHIELD_ABI = [
  "function recordEarthquake(uint256 magnitude, int256 latitude, int256 longitude, uint256 depth, string publicId) returns (uint256)",
  "function getQuakeCount() view returns (uint256)",
  "function recordedQuakes(uint256) view returns (uint256 magnitude, int256 latitude, int256 longitude, uint256 depth, uint256 timestamp, string publicId)",
  "event QuakeRecorded(uint256 indexed quakeId, uint256 magnitude, int256 lat, int256 lng)",

  // Regional investments
  "function getRegionCount() view returns (uint256)",
  "function getRegion(uint256) view returns (tuple(string name, int256 south, int256 north, int256 west, int256 east, uint256 totalAssets, uint256 totalShares, uint256 epoch, uint256 riskScoreBps, uint256 riskUpdatedAt, uint256 lastAccrualAt, uint256 lastQuakeAt, uint256 quakeCount, uint256 totalInterestPaid, uint256 totalLosses, bool active))",
  "function setRegionRiskScores(uint256[] regionIds, uint256[] riskScoresBps)",
  "function accrueAllRegions() returns (uint256)",
  "function ACCRUAL_PERIOD() view returns (uint256)",
];

const LATLNG_SCALE = 1_000_000;

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let quakeShieldContract: ethers.Contract;

/**
 * Initialize blockchain connection
 */
export function initBlockchain(): void {
  provider = new ethers.JsonRpcProvider(env.RPC_URL);
  wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);
  quakeShieldContract = new ethers.Contract(env.QUAKE_SHIELD_ADDRESS, QUAKESHIELD_ABI, wallet);

  console.log(`[Blockchain] Connected to ${env.NETWORK_NAME}`);
  console.log("[Blockchain] Oracle address:", wallet.address);
  console.log("[Blockchain] QuakeShield:", env.QUAKE_SHIELD_ADDRESS);
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

// ============ Regions ============

export interface OnChainRegion extends RegionBounds {
  riskScoreBps: number;
  lastAccrualAt: bigint;
  totalAssets: bigint;
  active: boolean;
}

/**
 * Read every registered region off the contract. The contract is the source of
 * truth for region boundaries — the oracle never carries its own copy, so the
 * two can't drift apart.
 */
export async function getRegions(): Promise<OnChainRegion[]> {
  const count = Number(await quakeShieldContract.getRegionCount());
  const regions: OnChainRegion[] = [];

  for (let i = 0; i < count; i++) {
    const region = await quakeShieldContract.getRegion(i);
    regions.push({
      id: i,
      name: region.name,
      south: Number(region.south) / LATLNG_SCALE,
      north: Number(region.north) / LATLNG_SCALE,
      west: Number(region.west) / LATLNG_SCALE,
      east: Number(region.east) / LATLNG_SCALE,
      riskScoreBps: Number(region.riskScoreBps),
      lastAccrualAt: region.lastAccrualAt,
      totalAssets: region.totalAssets,
      active: region.active,
    });
  }

  return regions;
}

/** Push a batch of freshly computed risk scores in a single transaction. */
export async function submitRiskScores(
  regionIds: number[],
  riskScoresBps: number[]
): Promise<void> {
  if (regionIds.length === 0) return;

  console.log(`[Blockchain] Updating risk score for ${regionIds.length} region(s)`);
  const tx = await quakeShieldContract.setRegionRiskScores(regionIds, riskScoresBps);
  const receipt = await tx.wait();
  console.log(`[Blockchain] Risk scores updated in block ${receipt.blockNumber}`);
}

/** Settle every region that has a fortnight owing. */
export async function runAccrual(): Promise<void> {
  console.log("[Blockchain] Running fortnightly accrual");
  const tx = await quakeShieldContract.accrueAllRegions();
  const receipt = await tx.wait();
  console.log(`[Blockchain] Accrual settled in block ${receipt.blockNumber}`);
}

export async function getAccrualPeriodSeconds(): Promise<bigint> {
  return quakeShieldContract.ACCRUAL_PERIOD();
}
