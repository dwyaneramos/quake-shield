"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

const NZ_CENTER: [number, number] = [-41.2, 174.8];

const epicenterIcon = L.divIcon({
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 0 0 2px #dc2626, 0 0 12px rgba(220,38,38,0.5)"></div>`,
});

function MapClickHandler({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function magnitudeRadius(magnitude: number): number {
  if (magnitude >= 7) return 18;
  if (magnitude >= 6) return 14;
  if (magnitude >= 5) return 10;
  if (magnitude >= 4) return 7;
  return 5;
}

function magnitudeColor(magnitude: number): string {
  if (magnitude >= 6) return "#dc2626";
  if (magnitude >= 5) return "#d1650a";
  if (magnitude >= 4) return "#f2810c";
  return "#a3a3a3";
}

export interface AdminSimMapProps {
  epicenter: [number, number] | null;
  radiusKm: number;
  magnitude: number;
  onMapClick: (lat: number, lng: number) => void;
}

export function AdminSimMap({
  epicenter,
  radiusKm,
  magnitude,
  onMapClick,
}: AdminSimMapProps) {
  const mapRef = useRef<L.Map>(null);

  const handleFlyTo = useCallback(
    (lat: number, lng: number) => {
      mapRef.current?.flyTo([lat, lng], 8, { duration: 0.8 });
    },
    []
  );

  return (
    <MapContainer
      ref={mapRef}
      center={NZ_CENTER}
      zoom={5}
      className="h-[380px] w-full rounded-xl cursor-crosshair"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <MapClickHandler onClick={onMapClick} />

      {epicenter && (
        <>
          <Marker
            position={epicenter}
            icon={epicenterIcon}
          />
          <CircleMarker
            center={epicenter}
            radius={magnitudeRadius(magnitude)}
            pathOptions={{
              color: magnitudeColor(magnitude),
              fillColor: magnitudeColor(magnitude),
              fillOpacity: 0.6,
              weight: 2,
            }}
          />
          <CircleMarker
            center={epicenter}
            radius={radiusKm * 0.6}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.06,
              weight: 1.5,
              dashArray: "6 4",
            }}
          />
        </>
      )}
    </MapContainer>
  );
}

export function flyToCity(
  mapRef: React.RefObject<L.Map | null>,
  lat: number,
  lng: number
) {
  mapRef?.current?.flyTo([lat, lng], 8, { duration: 0.8 });
}
