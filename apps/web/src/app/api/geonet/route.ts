import { NextResponse } from "next/server";
import { fetchRecentQuakes } from "@/lib/geonet";
import { GEONET } from "@/lib/polygon";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mmi = Number(searchParams.get("mmi") ?? GEONET.MMI_THRESHOLD);

  try {
    const quakes = await fetchRecentQuakes(Number.isFinite(mmi) ? mmi : GEONET.MMI_THRESHOLD);
    return NextResponse.json({ quakes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GeoNet data" },
      { status: 502 }
    );
  }
}
