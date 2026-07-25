import {
  fetchRecentQuakes,
  fetchWFSQuakes,
  magnitudeToScaled,
  latLngToScaled,
} from "./geonet.js";
import {
  recordEarthquake,
  isQuakeRecorded,
  getRegions,
  submitRiskScores,
  runAccrual,
  getAccrualPeriodSeconds,
} from "./signer.js";
import { computeRiskScoreBps, countQuakesInRegion, RISK_MIN_MAGNITUDE } from "./risk.js";
import { env } from "./config.js";

const submittedQuakes = new Set<string>();

/**
 * Only rewrite a region's risk score when it has moved enough to matter — a
 * few basis points either way isn't worth a transaction.
 */
const RISK_UPDATE_THRESHOLD_BPS = 50;

let lastRiskRefreshAt = 0;
let lastAccrualCheckAt = 0;

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
 * Recompute every region's risk score from GeoNet's full quake history and
 * push the ones that have moved.
 *
 * This is what makes an investment's return dynamic: a region that has been
 * shaking lately scores higher, and the contract turns that score into a
 * higher APR to compensate whoever backs it.
 */
export async function refreshRegionRisk(): Promise<void> {
  const regions = await getRegions();
  if (regions.length === 0) {
    console.log("[Risk] No regions registered on this deployment — skipping");
    return;
  }

  const since = new Date(Date.now() - env.RISK_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // One WFS query covering all of NZ, then bucketed locally by region box —
  // cheaper on GeoNet than one request per region.
  const quakes = await fetchWFSQuakes({
    startTime: since.toISOString(),
    minMagnitude: RISK_MIN_MAGNITUDE,
    maxResults: 2000,
  });

  console.log(
    `[Risk] ${quakes.length} quakes M${RISK_MIN_MAGNITUDE}+ in the last ${env.RISK_WINDOW_DAYS} days`
  );

  const changedIds: number[] = [];
  const changedScores: number[] = [];

  for (const region of regions) {
    const score = computeRiskScoreBps(quakes, region);
    const count = countQuakesInRegion(quakes, region);
    const delta = Math.abs(score - region.riskScoreBps);

    console.log(
      `[Risk] ${region.name}: ${count} quakes → score ${score} bps (was ${region.riskScoreBps})`
    );

    if (delta >= RISK_UPDATE_THRESHOLD_BPS) {
      changedIds.push(region.id);
      changedScores.push(score);
    }
  }

  if (changedIds.length === 0) {
    console.log("[Risk] No region moved enough to be worth an update");
    return;
  }

  await submitRiskScores(changedIds, changedScores);
}

/**
 * Pay out any region whose fortnight is up. The contract decides what each
 * region has earned (and skips the ones a quake interrupted) — this just
 * triggers it on schedule.
 */
export async function checkAndAccrue(): Promise<void> {
  const regions = await getRegions();
  if (regions.length === 0) return;

  const period = await getAccrualPeriodSeconds();
  const now = BigInt(Math.floor(Date.now() / 1000));

  const due = regions.filter(
    (region) => region.totalAssets > 0n && now >= region.lastAccrualAt + period
  );

  if (due.length === 0) {
    console.log("[Accrual] Nothing due yet");
    return;
  }

  console.log(`[Accrual] ${due.length} region(s) due: ${due.map((r) => r.name).join(", ")}`);
  await runAccrual();
}

/**
 * Start the polling loop
 */
export function startPolling(): void {
  console.log(`[Poller] Starting every ${env.POLL_INTERVAL_MS / 1000}s`);
  console.log(`[Risk] Refreshing region risk every ${env.RISK_REFRESH_MS / 1000 / 60 / 60}h`);
  console.log(`[Accrual] Checking every ${env.ACCRUAL_CHECK_MS / 1000 / 60}min`);

  const tick = async () => {
    await pollAndRecord();

    const now = Date.now();

    if (now - lastRiskRefreshAt >= env.RISK_REFRESH_MS) {
      lastRiskRefreshAt = now;
      try {
        await refreshRegionRisk();
      } catch (error) {
        console.error("[Risk] Failed to refresh region risk:", error);
      }
    }

    if (now - lastAccrualCheckAt >= env.ACCRUAL_CHECK_MS) {
      lastAccrualCheckAt = now;
      try {
        await checkAndAccrue();
      } catch (error) {
        console.error("[Accrual] Failed to run accrual:", error);
      }
    }
  };

  tick();
  setInterval(() => {
    tick();
  }, env.POLL_INTERVAL_MS);
}
