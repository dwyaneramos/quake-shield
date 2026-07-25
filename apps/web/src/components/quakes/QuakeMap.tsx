"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { GeoNetQuake } from "@/types";
import { getMagnitudeLabel } from "@quakeshield/shared";

const NZ_CENTER: [number, number] = [-41.2, 174.8];

function magnitudeColor(magnitude: number): string {
  if (magnitude >= 6) return "#dc2626";
  if (magnitude >= 5) return "#d1650a";
  if (magnitude >= 4) return "#f2810c";
  if (magnitude >= 3) return "#fd9d24";
  if (magnitude >= 2) return "#a3a3a3";
  return "#d4d4d4";
}

function magnitudeRadius(magnitude: number): number {
  if (magnitude >= 6) return 12;
  if (magnitude >= 5) return 9;
  if (magnitude >= 4) return 7;
  if (magnitude >= 3) return 5;
  if (magnitude >= 2) return 4;
  return 3;
}

function QuakePopup({ quake }: { quake: GeoNetQuake }) {
  const date = new Date(quake.time);
  return (
    <div className="min-w-[180px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: magnitudeColor(quake.magnitude) }}
        >
          {quake.magnitude.toFixed(1)}
        </span>
        <span className="font-semibold text-gray-900 text-sm">{quake.locality || "Unknown"}</span>
      </div>
      <div className="text-xs text-gray-500 space-y-0.5 mt-2">
        <div>{getMagnitudeLabel(quake.magnitude)} · MMI {quake.mmi}</div>
        <div>Depth: {quake.depth.toFixed(1)} km</div>
        <div>{date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })} at {date.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}</div>
        {quake.latitude !== undefined && quake.longitude !== undefined && (
          <div className="text-gray-400">{quake.latitude.toFixed(3)}, {quake.longitude.toFixed(3)}</div>
        )}
      </div>
    </div>
  );
}

export function QuakeMap({ quakes }: { quakes: GeoNetQuake[] }) {
  const plotted = quakes.filter((q) => typeof q.latitude === "number" && typeof q.longitude === "number");

  return (
    <MapContainer
      center={NZ_CENTER}
      zoom={5}
      className="h-[480px] w-full"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {plotted.map((quake) => (
        <CircleMarker
          key={quake.publicID}
          center={[quake.latitude as number, quake.longitude as number]}
          radius={magnitudeRadius(quake.magnitude)}
          pathOptions={{
            color: magnitudeColor(quake.magnitude),
            fillColor: magnitudeColor(quake.magnitude),
            fillOpacity: quake.magnitude >= 4 ? 0.7 : 0.4,
            weight: quake.magnitude >= 4 ? 2 : 1,
          }}
        >
          <Popup>
            <QuakePopup quake={quake} />
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
