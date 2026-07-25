import { NextResponse } from "next/server";
import { fetchRecentQuakes } from "@/lib/geonet";
import { NZ_CITIES, CITY_RADIUS_KM, getCityById, type NZCity } from "@/lib/cities";

interface TrendPoint {
  time: string;
  probability: number;
  quakeCount: number;
  maxMagnitude: number;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateProbability(
  quakeCount: number,
  maxMag: number,
  avgDepth: number,
  minMagnitude: number
): number {
  const freqScore = quakeCount > 0 ? Math.log10(quakeCount + 1) * 0.15 : 0;
  const magScore =
    maxMag >= minMagnitude
      ? (maxMag - (minMagnitude - 1)) * 0.3
      : maxMag >= minMagnitude - 2
        ? 0.01 * maxMag
        : 0;
  const depthBonus = avgDepth < 30 ? 0.05 : 0;
  return freqScore + magScore + depthBonus;
}

function buildTrendData(
  quakes: any[],
  city: NZCity,
  minMagnitude: number,
  bucketCount = 12
): TrendPoint[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const bucketSize = (dayMs * 30) / bucketCount;

  const nearby = quakes.filter((q) => {
    if (q.latitude == null || q.longitude == null) return false;
    return haversineDistance(city.lat, city.lng, q.latitude, q.longitude) <= CITY_RADIUS_KM;
  });

  const sorted = [...nearby].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const points: TrendPoint[] = [];
  let runningProb = 0.005;

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = now - (bucketCount - i) * bucketSize;
    const bucketEnd = bucketStart + bucketSize;

    const bucketQuakes = sorted.filter((q) => {
      const t = new Date(q.time).getTime();
      return t >= bucketStart && t < bucketEnd;
    });

    const count = bucketQuakes.length;
    const maxMag = count > 0 ? Math.max(...bucketQuakes.map((q: any) => q.magnitude)) : 0;
    const avgDepth = count > 0 ? bucketQuakes.reduce((s: number, q: any) => s + q.depth, 0) / count : 100;

    const raw = calculateProbability(count, maxMag, avgDepth, minMagnitude);
    runningProb = runningProb * 0.7 + raw * 0.3;
    const probability = Math.round(Math.max(0.0001, Math.min(runningProb, 5)) * 10000) / 10000;

    const date = new Date(bucketStart);
    points.push({
      time: date.toLocaleDateString("en-NZ", { month: "short", day: "numeric" }),
      probability,
      quakeCount: count,
      maxMagnitude: maxMag,
    });
  }

  return points;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("city") ?? "wellington";
  const minMagnitude = Number(searchParams.get("minMagnitude") ?? 5);

  const city = getCityById(cityId);
  if (!city) {
    return NextResponse.json({ error: `Unknown city: ${cityId}` }, { status: 400 });
  }

  try {
    const quakes = await fetchRecentQuakes(1);
    const trend = buildTrendData(quakes, city, minMagnitude);

    const nearby = quakes.filter((q: any) => {
      if (q.latitude == null || q.longitude == null) return false;
      return haversineDistance(city.lat, city.lng, q.latitude, q.longitude) <= CITY_RADIUS_KM;
    });

    const currentProbability = trend.length > 0 ? trend[trend.length - 1].probability : 2;

    return NextResponse.json({
      city,
      currentProbability,
      recentQuakeCount: nearby.length,
      trend,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch data" },
      { status: 502 }
    );
  }
}
