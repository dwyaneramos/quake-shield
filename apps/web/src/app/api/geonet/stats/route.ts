import { NextResponse } from "next/server";
import { fetchQuakeStats } from "@/lib/geonet";

export async function GET() {
  try {
    const stats = await fetchQuakeStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GeoNet stats" },
      { status: 502 }
    );
  }
}
