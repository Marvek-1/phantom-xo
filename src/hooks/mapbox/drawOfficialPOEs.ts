import type { MapboxDrawContext } from "./types";
import { T } from "./types";
import { supabase } from "@/integrations/supabase/client";

export async function drawOfficialPOEs(ctx: MapboxDrawContext): Promise<void> {
  const { map } = ctx;

  const { data, error } = await supabase
    .from("corridor_nodes")
    .select("id, name, lat, lng, country_code, node_type")
    .eq("node_type", "FORMAL_POE");

  if (error || !data) return;

  const features: GeoJSON.Feature[] = data.map((node) => ({
    type: "Feature",
    properties: {
      name: `${node.name} [${node.country_code}]`,
    },
    geometry: {
      type: "Point",
      coordinates: [node.lng, node.lat],
    },
  }));

  map.addSource("official-poes", {
    type: "geojson",
    data: { type: "FeatureCollection", features },
  });

  map.addLayer({
    id: "official-poes-circle",
    type: "circle",
    source: "official-poes",
    paint: {
      "circle-radius": 7,
      "circle-color": T.blue,
      "circle-stroke-color": T.blue,
      "circle-stroke-width": 3,
      "circle-stroke-opacity": 0.3,
    },
  });

  map.addLayer({
    id: "official-poes-labels",
    type: "symbol",
    source: "official-poes",
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Regular"],
      "text-size": 10,
      "text-offset": [0, -2],
      "text-anchor": "bottom",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": T.blue,
      "text-halo-color": T.bg,
      "text-halo-width": 2,
    },
  });

  console.log(`[Mapbox] Drew ${data.length} official POEs`);
}
