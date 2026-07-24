import { initBlockchain } from "./signer.js";
import { startPolling } from "./poller.js";
import { env } from "./config.js";

console.log("===========================================");
console.log("  QuakeShield Oracle Service");
console.log("===========================================");
console.log("Network: Polygon Amoy");
console.log("Contract:", env.QUAKE_SHIELD_ADDRESS);
console.log("Min Magnitude:", env.MIN_MAGITUDE_TO_REPORT / 100);
console.log("Poll Interval:", env.POLL_INTERVAL_MS / 1000, "seconds");
console.log("===========================================\n");

// Initialize blockchain connection
initBlockchain();

// Start polling GeoNet
startPolling();
