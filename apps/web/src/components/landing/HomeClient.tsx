"use client";

import { useState } from "react";
import EarthquakeProbabilityGraph from "./EarthquakeProbabilityGraph";
import CityWidgets from "./CityWidgets";

export default function HomeClient({
  minMagnitude = 5,
}: {
  minMagnitude?: number;
}) {
  const [selectedCity, setSelectedCity] = useState("wellington");

  return (
    <>
      <EarthquakeProbabilityGraph
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        minMagnitude={minMagnitude}
      />
      <CityWidgets
        selectedCity={selectedCity}
        onSelect={setSelectedCity}
      />
    </>
  );
}
