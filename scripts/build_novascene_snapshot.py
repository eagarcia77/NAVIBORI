#!/usr/bin/env python3
"""NAVIBORI NovaScene: reproducible, offline Overture building-footprint extract.

Input is a GeoJSON export from the Overture Maps buildings theme (ODbL).
No consumer/GPS data is downloaded or recorded. Height estimates are visual
only, never actual measured heights or road-clearance information.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
import pathlib

DEFAULT_BBOX = (-66.531, 18.037, -66.486, 18.068)
MAX_FEATURES = 14000


def normalize_ring(raw):
    output = []
    for point in raw:
        if not isinstance(point, (list, tuple)) or len(point) < 2:
            continue
        lon, lat = point[:2]
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (lon, lat)):
            continue
        item = [round(float(lon), 6), round(float(lat), 6)]
        if not output or item != output[-1]:
            output.append(item)
    if output and output[0] != output[-1]:
        output.append(output[0])
    return output if len(output) >= 4 else None


def geometry_to_polygon(feature):
    geometry = feature.get("geometry") or {}
    typ = geometry.get("type")
    coords = geometry.get("coordinates") or []
    if typ == "Polygon" and coords:
        rings = [normalize_ring(r) for r in coords]
        rings = [r for r in rings if r]
        return {"type": "Polygon", "coordinates": rings} if rings else None
    if typ == "MultiPolygon" and coords:
        polygons = []
        for polygon in coords:
            rings = [normalize_ring(r) for r in polygon]
            rings = [r for r in rings if r]
            if rings:
                polygons.append(rings)
        return {"type": "MultiPolygon", "coordinates": polygons} if polygons else None
    return None


def safe_height(number):
    try:
        result = float(number)
        return result if math.isfinite(result) and 2 <= result <= 300 else None
    except (ValueError, TypeError):
        return None


def transform(raw, bbox):
    if raw.get("type") == "FeatureCollection":
        items = raw.get("features") or []
    elif isinstance(raw, list):
        items = raw
    else:
        raise ValueError("Expected a FeatureCollection or GeoJSON feature array")
    result, seen = [], set()
    west, south, east, north = bbox
    for feature in items:
        geom = geometry_to_polygon(feature)
        if not geom:
            continue
        outer = geom["coordinates"][0] if geom["type"] == "Polygon" else geom["coordinates"][0][0]
        longitude = sum(p[0] for p in outer) / len(outer)
        latitude = sum(p[1] for p in outer) / len(outer)
        if not (west <= longitude <= east and south <= latitude <= north):
            continue
        raw_id = str(feature.get("id") or f"{longitude:.6f},{latitude:.6f}")
        if raw_id in seen:
            continue
        seen.add(raw_id)
        props = feature.get("properties") or {}
        measured_height = safe_height(props.get("height"))
        if measured_height is None:
            floors = safe_height(props.get("num_floors"))
            if floors is not None:
                height = min(150, max(3.0, floors * 3.0))
            else:
                # Stable variations provide low-rise depth and distinguish roofs.
                # Visual estimates must never be presented as measured data.
                variation = int(hashlib.sha256(raw_id.encode()).hexdigest()[:4], 16) % 4
                height = (6.6, 7.8, 9.0, 10.2)[variation]
        else:
            height = measured_height
        result.append({
            "type": "Feature",
            "id": raw_id,
            "properties": {
                "height": round(height, 2),
                "base": 0,
                "estimated": measured_height is None,
            },
            "geometry": geom,
        })
        if len(result) >= MAX_FEATURES:
            break
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", default="public/data/novascene/juana-diaz.geojson")
    parser.add_argument("--bbox", default=",".join(str(i) for i in DEFAULT_BBOX))
    args = parser.parse_args()
    bbox = tuple(float(x) for x in args.bbox.split(","))
    if len(bbox) != 4 or not (bbox[0] < bbox[2] and bbox[1] < bbox[3]):
        raise ValueError("Expected --bbox west,south,east,north")
    source_path = pathlib.Path(args.input)
    with source_path.open(encoding="utf-8") as stream:
        source = json.load(stream)
    features = transform(source, bbox)
    if not features:
        raise RuntimeError("No real building footprints were found. Do not publish an empty snapshot.")
    output = pathlib.Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "source": "Overture Maps Foundation buildings, derived in part from OpenStreetMap",
            "license": "ODbL 1.0",
            "attribution": "© OpenStreetMap contributors, Overture Maps Foundation",
            "measured_heights": "Only where original data provides height",
            "estimated_heights": "Other heights are illustrative and NOT verified",
            "bbox": bbox,
            "generated": dt.datetime.now(dt.timezone.utc).isoformat(),
        },
    }
    output.write_text(
        json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print("NovaScene geographic snapshot:", len(features), "real building footprints,",
          output.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
