import { fetchRecentQuakes, magnitudeToScaled, latLngToScaled } from "./geonet.js";
import {
  recordEarthquake,
  isQuakeRecorded,
  getRecordedQuakes,
  getUnresolvedMarkets,
  submitMarketResolution,
} from "./signer.js";
import { env } from "./config.js";

const submittedQuakes = new Set<string>();

async function pollAndRecord(): Promise<void> {
  try {
    console.log("[Poller] Checking for new earthquakes...");
    const quakes = await fetchRecentQuakes(-1);
    console.log(`[Poller] Found ${quakes.length} quakes`);

    let newQuakes = 0;
    for (const quake of quakes) {
      if (submittedQuakes.has(quake.publicID)) continue;
      if (await isQuakeRecorded(quake.publicID)) {
        submittedQuakes.add(quake.publicID);
        continue;
      }
      const magnitudeScaled = magnitudeToScaled(quake.magnitude);
      if (magnitudeScaled < env.MIN_MAGITUDE_TO_REPORT) continue;
      if (quake.latitude === undefined || quake.longitude === undefined) continue;

      try {
        await recordEarthquake(
          magnitudeScaled, latLngToScaled(quake.latitude), latLngToScaled(quake.longitude),
          BigInt(Math.round(quake.depth)), quake.publicID
        );
        submittedQuakes.add(quake.publicID);
        newQuakes++;
        console.log(`[Poller] Recorded M${quake.magnitude} earthquake ${quake.publicID}`);
      } catch (error) {
        console.error(`[Poller] Failed to record ${quake.publicID}:`, error);
      }
    }

    if (newQuakes === 0) console.log("[Poller] No new earthquakes to record");
    else console.log(`[Poller] Recorded ${newQuakes} new earthquake(s)`);
  } catch (error) {
    console.error("[Poller] Error polling GeoNet:", error);
  }
}

/**
 * Mirrors EarthquakeMarket.sol's simplified (non-Haversine) MVP distance
 * check exactly, in BigInt, so this pre-check agrees with what the on-chain
 * resolveMarket() call will itself verify.
 */
function approxDistanceKmSquared(latDiff: bigint, lngDiff: bigint): bigint {
  const kmPerDegLat = 111000000n;
  const kmPerDegLng = 83000000n;
  const distLat = (latDiff * kmPerDegLat) / 1000000000000n;
  const distLng = (lngDiff * kmPerDegLng) / 1000000000000n;
  return distLat * distLat + distLng * distLng;
}

/**
 * Resolve EarthquakeMarket markets directly against QuakeShield's recorded
 * quake log on this chain — one source of truth, no second oracle submission
 * path. A market resolves YES as soon as a matching quake is found, or NO
 * once its resolutionTime has passed with nothing matching.
 */
export async function checkAndResolveMarkets(): Promise<void> {
  const markets = await getUnresolvedMarkets();
  if (markets.length === 0) return;

  console.log(`[Resolver] Checking ${markets.length} unresolved market(s)...`);
  const quakes = await getRecordedQuakes();
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  for (const market of markets) {
    const radiusSq = market.radiusKm * market.radiusKm;
    const qualifying = quakes.find(
      (q) =>
        q.magnitude >= market.triggerMagnitude &&
        q.timestamp >= market.createdAt &&
        q.timestamp <= market.resolutionTime &&
        approxDistanceKmSquared(market.centerLat - q.latitude, market.centerLng - q.longitude) <= radiusSq
    );

    try {
      if (qualifying) {
        await submitMarketResolution(market.id, true);
      } else if (nowSec >= market.resolutionTime) {
        await submitMarketResolution(market.id, false);
      }
    } catch (error) {
      console.error(`[Resolver] Failed to resolve market ${market.id}:`, error);
    }
  }
}

/**
 * Start the polling loop
 */
export function startPolling(): void {
  console.log(`[Poller] Starting every ${env.POLL_INTERVAL_MS / 1000}s`);

  const tick = async () => {
    await pollAndRecord();
    await checkAndResolveMarkets();
  };
  tick();
  setInterval(() => {
    tick();
  }, env.POLL_INTERVAL_MS);
}
