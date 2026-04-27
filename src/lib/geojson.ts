// Lightweight GeoJSON utilities — centroid (rough) and bbox computation.
// Avoids extra deps; suitable for property reference points.

type Coord = [number, number];
type Pos = number[]; // [lng, lat] possibly with elevation

export interface GeoJSONParsed {
  geojson: GeoJSON.GeoJsonObject;
  bbox: [number, number, number, number] | null; // [minLng, minLat, maxLng, maxLat]
  centroid: { lat: number; lng: number } | null;
  featureCount: number;
}

function isPos(p: unknown): p is Pos {
  return Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number";
}

function* iterPositions(g: unknown): Generator<Coord> {
  if (!g || typeof g !== "object") return;
  const obj = g as { type?: string; coordinates?: unknown; geometries?: unknown[]; features?: unknown[]; geometry?: unknown };
  switch (obj.type) {
    case "FeatureCollection":
      for (const f of obj.features ?? []) yield* iterPositions(f);
      return;
    case "Feature":
      yield* iterPositions(obj.geometry);
      return;
    case "GeometryCollection":
      for (const g2 of obj.geometries ?? []) yield* iterPositions(g2);
      return;
    case "Point":
      if (isPos(obj.coordinates)) yield [obj.coordinates[0], obj.coordinates[1]];
      return;
    case "MultiPoint":
    case "LineString":
      for (const p of (obj.coordinates ?? []) as unknown[]) {
        if (isPos(p)) yield [p[0], p[1]];
      }
      return;
    case "MultiLineString":
    case "Polygon":
      for (const ring of (obj.coordinates ?? []) as unknown[][]) {
        for (const p of ring) {
          if (isPos(p)) yield [p[0], p[1]];
        }
      }
      return;
    case "MultiPolygon":
      for (const poly of (obj.coordinates ?? []) as unknown[][][]) {
        for (const ring of poly) {
          for (const p of ring) {
            if (isPos(p)) yield [p[0], p[1]];
          }
        }
      }
      return;
  }
}

export function parseGeoJSON(text: string): GeoJSONParsed {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Arquivo não é um JSON válido.");
  }
  if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
    throw new Error("Estrutura GeoJSON inválida (campo 'type' ausente).");
  }
  const geojson = parsed as GeoJSON.GeoJsonObject;

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let sumLng = 0, sumLat = 0, n = 0;
  for (const [lng, lat] of iterPositions(geojson)) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
    sumLng += lng; sumLat += lat; n++;
  }

  if (n === 0) throw new Error("GeoJSON sem coordenadas válidas.");

  const centroid = { lat: sumLat / n, lng: sumLng / n };
  const bbox: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];

  let featureCount = 1;
  if ((geojson as { type: string }).type === "FeatureCollection") {
    featureCount = ((geojson as unknown as { features: unknown[] }).features ?? []).length;
  }

  return { geojson, bbox, centroid, featureCount };
}
