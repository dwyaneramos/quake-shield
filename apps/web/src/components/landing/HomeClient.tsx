"use client";

import { useState } from "react";
import EarthquakeProbabilityGraph from "./EarthquakeProbabilityGraph";
import CityWidgets from "./CityWidgets";

export default function HomeClient() {
  const [selectedCity, setSelectedCity] = useState("wellington");

  return (
    <>
      <EarthquakeProbabilityGraph
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
      />
      <CityWidgets
        selectedCity={selectedCity}
        onSelect={setSelectedCity}
      />
    </>
  );
}
