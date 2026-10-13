#!/usr/bin/env python3
"""Build locally hosted NovaScene 2.1 geographic cells from Overture GeoJSON.

Every real footprint is kept, not truncated to the first N records. Polygons
touching multiple cells are copied to each; the browser deduplicates by ID.
The cell index is intentionally regular so a GPS view only fetches nearby cells.
Geometry is ground truth from Overture; unknown heights remain clearly estimated.
"""
import argparse
import datetime as dt
import json
import math
from pathlib import Path

from build_novascene_snapshot import transform

DEFAULT_BBOX=(-66.565,18.015,-66.458,18.095)
STEP=0.01


def feature_bbox(feature):
    geometry=feature["geometry"]
    polys=[geometry["coordinates"]] if geometry["type"]=="Polygon" else geometry["coordinates"]
    positions=[point for poly in polys for ring in poly for point in ring]
    return (min(p[0] for p in positions),min(p[1] for p in positions),
            max(p[0] for p in positions),max(p[1] for p in positions))


def write_tiles(raw,bbox,out_dir,step=STEP):
    west,south,east,north=bbox
    features=transform(raw,bbox)
    if len(features)<1000:
        raise RuntimeError("Insufficient actual building footprints; refusing to publish")
    output=Path(out_dir)
    output.mkdir(parents=True,exist_ok=True)
    for old in output.glob("*.geojson"):
        old.unlink()
    buckets={}
    for feature in features:
        min_lon,min_lat,max_lon,max_lat=feature_bbox(feature)
        # Include all cells touched by a footprint, not only its centroid.
        x1=max(0,math.floor((min_lon-west)/step))
        x2=min(math.ceil((east-west)/step)-1,math.floor((max_lon-west)/step))
        y1=max(0,math.floor((min_lat-south)/step))
        y2=min(math.ceil((north-south)/step)-1,math.floor((max_lat-south)/step))
        for x in range(x1,x2+1):
            for y in range(y1,y2+1):
                buckets.setdefault((x,y),[]).append(feature)
    index={}
    for (x,y),tile_features in sorted(buckets.items()):
        name=f"{x}-{y}.geojson"
        collection={"type":"FeatureCollection","features":tile_features}
        (output/name).write_text(
            json.dumps(collection,ensure_ascii=False,separators=(",",":"))+"\n",
            encoding="utf-8")
        index[f"{x}-{y}"]={"path":f"/data/novascene/tiles/v2/{name}",
                             "count":len(tile_features)}
    manifest={
        "version":2,
        "source":"Overture Maps Foundation buildings, derived in part from OpenStreetMap",
        "license":"ODbL 1.0",
        "attribution":"© OpenStreetMap contributors, Overture Maps Foundation",
        "heightPolicy":"Known heights measured; otherwise visual estimates, not validated",
        "bbox":list(bbox),"step":step,
        "uniqueBuildings":len(features),
        "tiles":index,
        "generated":dt.datetime.now(dt.timezone.utc).isoformat()
    }
    (output.parent/"manifest-v2.json").write_text(
        json.dumps(manifest,ensure_ascii=False,separators=(",",":"))+"\n",
        encoding="utf-8")
    print(f"NovaScene v2.1: {len(features)} unique footprints in {len(index)} cells; "
          f"no artificial viewport or feature count cap; bbox {bbox}")


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",required=True)
    parser.add_argument("--output",default="public/data/novascene/tiles/v2")
    parser.add_argument("--bbox",default=",".join(map(str,DEFAULT_BBOX)))
    args=parser.parse_args()
    bbox=tuple(float(value) for value in args.bbox.split(","))
    if len(bbox)!=4 or not (bbox[0]<bbox[2] and bbox[1]<bbox[3]):
        raise ValueError("Use --bbox west,south,east,north")
    with Path(args.input).open(encoding="utf-8") as f:
        raw=json.load(f)
    write_tiles(raw,bbox,args.output)


if __name__=="__main__":
    main()
