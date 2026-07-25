import { fetchRecentQuakes, magnitudeToScaled, latLngToScaled, resolveMarket, type MarketCriteria } from "./geonet.js";
import { recordEarthquake, isQuakeRecorded } from "./signer.js";
import { env } from "./config.js";

// Track submitted quakes in memory (for current session)
const submittedQuakes = new Set<string>();

/**
 * Poll GeoNet for new earthquakes and record on-chain
 */
async function pollAndRecord(): Promise<void> {
  try {
    console.log("[Poller] Checking for new earthquakes...");

    const quakes = await fetchRecentQuakes(-1); // All quakes
    console.log(`[Poller] Found ${quakes.length} quakes`);

    let newQuakes = 0;

    for (const quake of quakes) {
      // Skip if already submitted this session
      if (submittedQuakes.has(quake.publicID)) {
        continue;
      }

      // Skip if already on-chain
      if (await isQuakeRecorded(quake.publicID)) {
        submittedQuakes.add(quake.publicID);
        continue;
      }

      // Skip if below minimum magnitude
      const magnitudeScaled = magnitudeToScaled(quake.magnitude);
      if (magnitudeScaled < env.MIN_MAGITUDE_TO_REPORT) {
        console.log(`[Poller] Skipping ${quake.publicID}: magnitude ${quake.magnitude} < ${env.MIN_MAGITUDE_TO_REPORT / 100}`);
        continue;
      }

      // Skip if missing coordinates
      if (quake.latitude === undefined || quake.longitude === undefined) {
        console.log(`[Poller] Skipping ${quake.publicID}: missing coordinates`);
        continue;
      }

      // Record earthquake on chain
      const latScaled = latLngToScaled(quake.latitude);
      const lngScaled = latLngToScaled(quake.longitude);
      const depth = BigInt(Math.round(quake.depth));

      try {
        await recordEarthquake(magnitudeScaled, latScaled, lngScaled, depth, quake.publicID);
        submittedQuakes.add(quake.publicID);
        newQuakes++;
        console.log(`[Poller] Recorded earthquake ${quake.publicID} (M${quake.magnitude})`);
      } catch (error) {
        console.error(`[Poller] Failed to record ${quake.publicID}:`, error);
      }
    }

    if (newQuakes === 0) {
      console.log("[Poller] No new earthquakes to record");
    } else {
      console.log(`[Poller] Recorded ${newQuakes} new earthquake(s)`);
    }
  } catch (error) {
    console.error("[Poller] Error polling GeoNet:", error);
  }
}

/**
 * Resolve prediction markets against GeoNet data
 * Called with a list of active market criteria from the contract
 */
export async function resolveMarkets(markets: MarketCriteria[]): Promise<void> {
  if (markets.length === 0) return;

  console.log(`[Resolver] Checking ${markets.length} market(s) for resolution...`);

  for (const criteria of markets) {
    try {
      const result = await resolveMarket(criteria);

      if (!result.resolved) {
        console.log(`[Resolver] Market not yet resolvable (time window still open)`);
        continue;
      }

      if (result.outcome) {
        console.log(`[Resolver] YES — qualifying earthquake found: M${result.qualifyingQuake?.magnitude} at ${result.qualifyingQuake?.locality}`);
      } else {
        console.log(`[Resolver] NO — no qualifying earthquake in time window`);
      }
    } catch (error) {
      console.error(`[Resolver] Error resolving market:`, error);
    }
  }
}

/**
 * Start the polling loop
 */
export function startPolling(): void {
  console.log(`[Poller] Starting earthquake recording every ${env.POLL_INTERVAL_MS / 1000}s`);

  // Initial poll
  pollAndRecord();

  // Recurring poll
  setInterval(pollAndRecord, env.POLL_INTERVAL_MS);
}
