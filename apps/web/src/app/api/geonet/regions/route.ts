import { NextResponse } from "next/server";
import { NZ_REGIONS, isInRegion, type NZRegion } from "@quakeshield/shared";
import { fetchWFSQuakes } from "@/lib/geonet";
import { NZ_BOUNDS } from "@/lib/chains";

interface TrendPoint {
  time: string;
  quakeCount: number;
  maxMagnitude: number;
}

interface RegionQuakeSummary {
  region: NZRegion;
  quakeCount: number;
  maxMagnitude: number;
  /** 0-10000, the same formula the oracle uses to price a region's return —
   * shown here as a live preview of what the on-chain risk score should
   * converge to next time the oracle refreshes it. */
  estimatedRiskScoreBps: number;
  trend: TrendPoint[];
}

const RISK_WINDOW_DAYS = 90;
const RISK_MIN_MAGNITUDE = 4;
const RISK_SATURATION = 100;

/** Mirrors apps/oracle/src/risk.ts exactly, so the UI preview matches what the oracle will push on-chain. */
function quakeWeight(magnitude: number): number {
  if (magnitude < RISK_MIN_MAGNITUDE) return 0;
  return Math.pow(2, magnitude - RISK_MIN_MAGNITUDE);
}

function estimateRiskScoreBps(quakes: { magnitude: number }[]): number {
  const weighted = quakes.reduce((sum, q) => sum + quakeWeight(q.magnitude), 0);
  if (weighted <= 0) return 0;
  const score = Math.log10(1 + weighted) / Math.log10(1 + RISK_SATURATION);
  return Math.max(0, Math.min(10000, Math.round(score * 10000)));
}

function buildTrend(
  quakes: { time: string; magnitude: number }[],
  bucketCount = 12
): TrendPoint[] {
  const now = Date.now();
  const windowMs = RISK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const bucketSize = windowMs / bucketCount;

  const sorted = [...quakes].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const points: TrendPoint[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = now - (bucketCount - i) * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    const bucketQuakes = sorted.filter((q) => {
      const t = new Date(q.time).getTime();
      return t >= bucketStart && t < bucketEnd;
    });

    points.push({
      time: new Date(bucketStart).toLocaleDateString("en-NZ", { month: "short", day: "numeric" }),
      quakeCount: bucketQuakes.length,
      maxMagnitude: bucketQuakes.length > 0 ? Math.max(...bucketQuakes.map((q) => q.magnitude)) : 0,
    });
  }
  return points;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regionId = searchParams.get("region");
  const headers = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };

  try {
    const since = new Date(Date.now() - RISK_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const quakes = await fetchWFSQuakes({
      bbox: NZ_BOUNDS,
      startTime: since.toISOString(),
      minMagnitude: RISK_MIN_MAGNITUDE,
      maxResults: 2000,
    });

    const regions = regionId
      ? NZ_REGIONS.filter((r) => r.id === regionId)
      : NZ_REGIONS;

    if (regionId && regions.length === 0) {
      return NextResponse.json({ error: `Unknown region: ${regionId}` }, { status: 400, headers });
    }

    const summaries: RegionQuakeSummary[] = regions.map((region) => {
      const inRegion = quakes.filter(
        (q) => q.latitude !== undefined && q.longitude !== undefined && isInRegion(region, q.latitude, q.longitude)
      );

      return {
        region,
        quakeCount: inRegion.length,
        maxMagnitude: inRegion.length > 0 ? Math.max(...inRegion.map((q) => q.magnitude)) : 0,
        estimatedRiskScoreBps: estimateRiskScoreBps(inRegion),
        trend: buildTrend(inRegion),
      };
    });

    return NextResponse.json(
      { windowDays: RISK_WINDOW_DAYS, regions: regionId ? summaries[0] : summaries },
      { headers }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch data" },
      { status: 502, headers }
    );
  }
}
