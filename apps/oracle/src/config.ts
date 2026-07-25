import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

export const env = {
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  POLYGON_AMOY_RPC: process.env.POLYGON_AMOY_RPC || "https://polygon-amoy-bor-rpc.publicnode.com",
  QUAKE_SHIELD_ADDRESS: process.env.QUAKE_SHIELD_ADDRESS || "",
  USDC_ADDRESS: process.env.USDC_ADDRESS || "",
  EARTHQUAKE_MARKET_ADDRESS: process.env.EARTHQUAKE_MARKET_ADDRESS || "",
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || "30000", 10),
  MIN_MAGITUDE_TO_REPORT: parseInt(process.env.MIN_MAGITUDE_TO_REPORT || "500", 10),
  GEONET_API_URL: process.env.GEONET_API_URL || "https://api.geonet.org.nz",
} as const;

const required = ["PRIVATE_KEY", "QUAKE_SHIELD_ADDRESS", "USDC_ADDRESS"] as const;
for (const key of required) {
  if (!env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
