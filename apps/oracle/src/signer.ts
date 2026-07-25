import { ethers } from "ethers";
import { env } from "./config.js";

// QuakeShield ABI (only the functions we need)
const QUAKESHIELD_ABI = [
  "function recordEarthquake(uint256 magnitude, int256 latitude, int256 longitude, uint256 depth, string publicId) returns (uint256)",
  "function getQuakeCount() view returns (uint256)",
  "function recordedQuakes(uint256) view returns (uint256 magnitude, int256 latitude, int256 longitude, uint256 depth, uint256 timestamp, string publicId)",
  "event QuakeRecorded(uint256 indexed quakeId, uint256 magnitude, int256 lat, int256 lng)",
];

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let contract: ethers.Contract;

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
