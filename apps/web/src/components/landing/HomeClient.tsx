"use client";

import { useState } from "react";
import EarthquakeProbabilityGraph from "./EarthquakeProbabilityGraph";
import CityWidgets from "./CityWidgets";

export default function HomeClient({
  minMagnitude = 5,
  settingsPanel,
}: {
  minMagnitude?: number;
  settingsPanel?: React.ReactNode;
}) {
  const [selectedCity, setSelectedCity] = useState("wellington");

  return (
    <>
      <EarthquakeProbabilityGraph
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        minMagnitude={minMagnitude}
        settingsPanel={settingsPanel}
      />
      <CityWidgets
        selectedCity={selectedCity}
        onSelect={setSelectedCity}
      />
    </>
  );
}
