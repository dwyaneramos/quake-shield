import { fetchRecentQuakes, magnitudeToScaled, latLngToScaled } from "./geonet.js";
import { recordEarthquake, isQuakeRecorded, getMarketCount, getMarket, resolveMarketOnChain } from "./signer.js";
import { env } from "./config.js";

const submittedQuakes = new Set<string>();
const resolvedMarkets = new Set<number>();

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function quakeMatchesMarket(
  quakeLat: number,
  quakeLng: number,
  quakeMagnitude: number,
  marketCenterLat: bigint,
  marketCenterLng: bigint,
  marketRadiusKm: bigint,
  marketTriggerMagnitude: bigint
): boolean {
  const quakeMagScaled = magnitudeToScaled(quakeMagnitude);
  if (quakeMagScaled < marketTriggerMagnitude) return false;
  const centerLat = Number(marketCenterLat) / 1_000_000;
  const centerLng = Number(marketCenterLng) / 1_000_000;
  return haversineDistanceKm(quakeLat, quakeLng, centerLat, centerLng) <= Number(marketRadiusKm);
}

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
        console.log(`[Poller] Recorded earthquake ${quake.publicID} (M${quake.magnitude})`);
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

async function resolveMarkets(): Promise<void> {
  try {
    const marketCount = await getMarketCount();
    if (marketCount === 0) return;

    console.log(`[Resolver] Checking ${marketCount} market(s)...`);
    const now = Math.floor(Date.now() / 1000);
    const quakes = await fetchRecentQuakes(-1);

    for (let i = 0; i < marketCount; i++) {
      if (resolvedMarkets.has(i)) continue;
      const market = await getMarket(i);
      if (!market || market.resolved) continue;

      let matchingQuakeFound = false;
      for (const quake of quakes) {
        if (quake.latitude === undefined || quake.longitude === undefined) continue;
        if (quakeMatchesMarket(
          quake.latitude, quake.longitude, quake.magnitude,
          market.centerLat, market.centerLng, market.radiusKm, market.triggerMagnitude
        )) {
          matchingQuakeFound = true;
          break;
        }
      }

      if (matchingQuakeFound) {
        console.log(`[Resolver] Market ${i}: matching quake found -> YES`);
        try {
          await resolveMarketOnChain(i, true);
          resolvedMarkets.add(i);
        } catch (error) {
          console.error(`[Resolver] Failed to resolve market ${i}:`, error);
        }
        continue;
      }

      if (now >= Number(market.resolutionTime)) {
        console.log(`[Resolver] Market ${i}: expired, no match -> NO`);
        try {
          await resolveMarketOnChain(i, false);
          resolvedMarkets.add(i);
        } catch (error) {
          console.error(`[Resolver] Failed to resolve market ${i}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("[Resolver] Error checking markets:", error);
  }
}

export function startPolling(): void {
  console.log(`[Poller] Starting every ${env.POLL_INTERVAL_MS / 1000}s`);
  pollAndRecord();
  resolveMarkets();
  setInterval(() => {
    pollAndRecord();
    resolveMarkets();
  }, env.POLL_INTERVAL_MS);
}
