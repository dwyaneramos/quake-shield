"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import { MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import type { NZRegion } from "@quakeshield/shared";

const pinIcon = new Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="#15805c"/><circle cx="14" cy="14" r="6" fill="white"/></svg>',
    ),
  iconSize: [28, 40],
  iconAnchor: [14, 40],
});

function FitToBoundary({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

export function RegionMap({
  region,
  markerLat,
  markerLng,
  markerLabel,
}: {
  region: NZRegion;
  markerLat: number;
  markerLng: number;
  markerLabel: string;
}) {
  // The region's real boundary — the same polygon the oracle tests a quake's
  // epicenter against, so what's drawn always matches what's insured.
  const bounds: LatLngBoundsExpression = useMemo(
    () => [
      [region.south, region.west],
      [region.north, region.east],
    ],
    [region],
  );

  return (
    <MapContainer
      key={region.id}
      bounds={bounds}
      boundsOptions={{ padding: [24, 24] }}
      className="h-[320px] w-full"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <Polygon
        positions={region.boundary}
        pathOptions={{
          color: "#15805c",
          weight: 2,
          fillColor: "#15805c",
          fillOpacity: 0.15,
        }}
      />
      <Marker position={[markerLat, markerLng]} icon={pinIcon}>
        <Tooltip permanent direction="top" offset={[0, -38]} className="!text-xs !font-semibold">
          {markerLabel}
        </Tooltip>
      </Marker>
      <FitToBoundary bounds={bounds} />
    </MapContainer>
  );
}
