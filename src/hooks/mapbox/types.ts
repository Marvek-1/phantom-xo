import type mapboxgl from "mapbox-gl";

export const T = {
  bg: "#070A10",
  green: "#00E87A",
  amber: "#F5A623",
  red: "#FF453A",
  blue: "#009ADE",
  teal: "#3DD9C4",
  text: "#E5E7EB",
};

export const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYWthbmltbzEiLCJhIjoiY2x4czNxbjU2MWM2eTJqc2gwNGIwaWhkMSJ9.jSwZdyaPa1dOHepNU5P71g";

export interface MapboxDrawContext {
  map: mapboxgl.Map;
}

export interface CorridorMeta {
  id: string;
  name: string;
  risk: string;
  km: number;
  mode: string;
  center: [number, number];
  zoom: number;
}

export const RISK_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  ELEVATED: "#EAB308",
  MODERATE: "#22C55E",
  LOW: "#3B82F6",
};
