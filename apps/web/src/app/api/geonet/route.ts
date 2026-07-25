import { NextResponse } from "next/server";
import { fetchRecentQuakes, fetchQuakesByRegion, bboxFromRadius } from "@/lib/geonet";
import { GEONET } from "@/lib/chains";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mmi = Number(searchParams.get("mmi") ?? GEONET.MMI_THRESHOLD);

  const bboxParam = searchParams.get("bbox");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const minMag = searchParams.get("minMag");
  const maxMag = searchParams.get("maxMag");
  const centerLat = searchParams.get("centerLat");
  const centerLng = searchParams.get("centerLng");
  const radiusKm = searchParams.get("radiusKm");

  const headers = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" };

  try {
    if (bboxParam || (centerLat && centerLng && radiusKm)) {
      let bbox;

      if (bboxParam) {
        const [west, south, east, north] = bboxParam.split(",").map(Number);
        if ([west, south, east, north].every(Number.isFinite)) {
          bbox = { west, south, east, north };
        }
      } else if (centerLat && centerLng && radiusKm) {
        const lat = Number(centerLat);
        const lng = Number(centerLng);
        const r = Number(radiusKm);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(r)) {
          bbox = bboxFromRadius(lat, lng, r);
        }
      }

      const quakes = await fetchQuakesByRegion({
        bbox,
        startTime: startTime ?? undefined,
        endTime: endTime ?? undefined,
        minMagnitude: minMag ? Number(minMag) : undefined,
        maxMagnitude: maxMag ? Number(maxMag) : undefined,
        maxResults: 1000,
      });

      return NextResponse.json({ quakes }, { headers });
    }

    const quakes = await fetchRecentQuakes(Number.isFinite(mmi) ? mmi : GEONET.MMI_THRESHOLD);
    return NextResponse.json({ quakes }, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GeoNet data" },
      { status: 502, headers }
    );
  }
}
