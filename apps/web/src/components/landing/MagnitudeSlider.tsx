"use client";

interface MagnitudeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function MagnitudeSlider({ value, onChange }: MagnitudeSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-ink-700">
          Minimum magnitude
        </label>
        <span className="text-sm font-bold text-shield-700 bg-shield-50 px-2 py-0.5 rounded-md">
          M{value.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={8}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full bg-ink-100 accent-shield-600 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-ink-400 mt-2">
        <span>M0</span>
        <span>M8</span>
      </div>
      <p className="text-xs text-ink-500 mt-3">
        Only show quakes at or above this magnitude in the live feed.
      </p>
    </div>
  );
}
