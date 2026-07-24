"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { GeoNetQuake } from "@/types";

const NZ_CENTER: [number, number] = [-41.2, 174.8];

function magnitudeColor(magnitude: number): string {
  if (magnitude >= 6) return "#ad4c0c"; // quake-700
  if (magnitude >= 5) return "#d1650a"; // quake-600
  if (magnitude >= 4) return "#f2810c"; // quake-500
  return "#fd9d24"; // quake-400
}

export function QuakeMap({ quakes }: { quakes: GeoNetQuake[] }) {
  return (
    <MapContainer center={NZ_CENTER} zoom={5} className="h-[400px] w-full" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {quakes
        .filter((q) => typeof q.latitude === "number" && typeof q.longitude === "number")
        .map((quake) => (
          <CircleMarker
            key={quake.publicID}
            center={[quake.latitude as number, quake.longitude as number]}
            radius={4 + quake.magnitude * 2}
            pathOptions={{
              color: magnitudeColor(quake.magnitude),
              fillColor: magnitudeColor(quake.magnitude),
              fillOpacity: 0.5,
              weight: 1.5,
            }}
          >
            <Popup>
              <p className="font-semibold">M{quake.magnitude.toFixed(1)} · {quake.locality}</p>
              <p className="text-sm">Depth {quake.depth.toFixed(1)}km · {new Date(quake.time).toLocaleString("en-NZ")}</p>
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}
