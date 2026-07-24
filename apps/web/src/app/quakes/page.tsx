"use client";

import { ConnectButton } from "@/components/web3/ConnectButton";
import Link from "next/link";

export default function QuakesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-quake-500">Quake</span>
            <span className="text-shield-500">Shield</span>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Earthquake Feed</h1>
            <p className="text-gray-600 mt-1">Real-time data from GeoNet (api.geonet.org.nz)</p>
          </div>
          <Link
            href="/policies/new"
            className="bg-shield-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-shield-700 transition-colors"
          >
            Buy Coverage
          </Link>
        </div>

        {/* Map Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
          <div className="h-[400px] bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500">Interactive map will render here (react-leaflet)</p>
          </div>
        </div>

        {/* Quake List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Recent Quakes</h2>
            <p className="text-sm text-gray-500 mt-1">Quakes with MMI ≥ 4 from the past 365 days</p>
          </div>
          <div className="divide-y">
            <QuakeItem magnitude={5.2} depth={15} locality="30 km NE of Wellington" time="2 hours ago" quality="best" />
            <QuakeItem magnitude={4.1} depth={22} locality="15 km SW of Christchurch" time="5 hours ago" quality="best" />
            <QuakeItem magnitude={3.8} depth={8} locality="10 km N of Kaikoura" time="1 day ago" quality="reviewed" />
            <div className="p-8 text-center text-gray-500">
              <p>Live quake data will load from GeoNet API</p>
              <p className="text-sm mt-2">Configure API proxy in /api/geonet/route.ts</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function QuakeItem({
  magnitude,
  depth,
  locality,
  time,
  quality,
}: {
  magnitude: number;
  depth: number;
  locality: string;
  time: string;
  quality: string;
}) {
  const magColor =
    magnitude >= 6
      ? "bg-red-100 text-red-700"
      : magnitude >= 5
        ? "bg-orange-100 text-orange-700"
        : "bg-yellow-100 text-yellow-700";

  return (
    <div className="p-4 hover:bg-gray-50 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg ${magColor}`}>
        {magnitude.toFixed(1)}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{locality}</p>
        <p className="text-sm text-gray-500">
          Depth: {depth} km · {time}
        </p>
      </div>
      <span className="text-xs text-gray-400 uppercase">{quality}</span>
    </div>
  );
}
