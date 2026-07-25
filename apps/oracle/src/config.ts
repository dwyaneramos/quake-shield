import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
// All apps in the monorepo share one root .env — see AGENTS.md.
config({ path: resolve(__dirname, "..", "..", "..", ".env") });

const NETWORKS = {
  sepolia: {
    name: "Ethereum Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "",
    quakeShieldAddress: process.env.QUAKE_SHIELD_ADDRESS_SEPOLIA || "",
    usdcAddress: process.env.USDC_ADDRESS_SEPOLIA || "",
    earthquakeMarketAddress: process.env.EARTHQUAKE_MARKET_ADDRESS_SEPOLIA || "",
  },
  fuji: {
    name: "Avalanche Fuji",
    rpcUrl: process.env.FUJI_RPC_URL || "",
    quakeShieldAddress: process.env.QUAKE_SHIELD_ADDRESS_FUJI || "",
    usdcAddress: process.env.USDC_ADDRESS_FUJI || "",
    earthquakeMarketAddress: process.env.EARTHQUAKE_MARKET_ADDRESS_FUJI || "",
  },
} as const;

// Which chain this process submits earthquakes to. Run a second oracle
// instance against the other chain with e.g. `NETWORK=fuji pnpm dev`.
const networkKey = (process.env.NETWORK || "sepolia").toLowerCase() as keyof typeof NETWORKS;
const network = NETWORKS[networkKey];
if (!network) {
  throw new Error(`Unknown NETWORK "${networkKey}". Expected one of: ${Object.keys(NETWORKS).join(", ")}`);
}

export const env = {
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  RPC_URL: network.rpcUrl,
  NETWORK_NAME: network.name,
  QUAKE_SHIELD_ADDRESS: network.quakeShieldAddress,
  USDC_ADDRESS: network.usdcAddress,
  // Optional — EarthquakeMarket may not be deployed to every chain yet.
  EARTHQUAKE_MARKET_ADDRESS: network.earthquakeMarketAddress,
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || "60000", 10),
  MIN_MAGITUDE_TO_REPORT: parseInt(process.env.MIN_MAGITUDE_TO_REPORT || "500", 10),
  GEONET_API_URL: process.env.GEONET_API_URL || "https://api.geonet.org.nz",
} as const;

const required = ["PRIVATE_KEY", "QUAKE_SHIELD_ADDRESS", "USDC_ADDRESS"] as const;
for (const key of required) {
  if (!env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
