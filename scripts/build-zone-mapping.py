"""
Build a feature ID -> zone mapping by sampling pixel colors from the user's
marked-up basemap image.

Inputs:
  public/data/levee-centerline.json  - levee feature GeoJSON
  grass-cutting-blank-basemap.png    - user's marked-up image

Output:
  public/data/grass-cutting-zones.json - { OBJECTID_1: zone_key }

Strategy:
  - Compute Web Mercator pixel position for each feature's coordinates.
  - Sample multiple points along the line plus a small radius around each.
  - Match dominant pixel color to the closest zone color.
"""

import json
import math
from collections import Counter
from pathlib import Path

from PIL import Image

REPO = Path("/Users/OscarBoochever/Development/fpa")

# Leaflet map config (matches GrassCuttingMap.tsx)
CENTER_LAT = 29.99
CENTER_LNG = -90.0
ZOOM = 11

# Map element pixel rect within the user's image
# (verified via playwright at viewport 1272x615, scroll y=800)
IMAGE_WIDTH = 1272
IMAGE_HEIGHT = 615
MAP_X = 33
MAP_Y = 81
MAP_WIDTH = 1198
MAP_HEIGHT = 498

# Zone colors (RGB) — calibrated against the user's marked image.
# Preview's markup palette is different from my original hex references,
# so these are the actual colors the user painted with.
# BLACK is omitted here because:
#   1. River=Y features get assigned BLACK directly (no sampling needed)
#   2. The basemap's gray levee lines look like BLACK and would cause false positives
ZONE_COLORS = {
    "GREEN": (112, 176, 64),
    "LIGHT_BLUE": (0, 240, 240),
    "NAVY_BLUE": (0, 80, 208),
    "YELLOW": (240, 240, 64),
    "ORANGE": (240, 96, 0),
}


def project_world(lat: float, lng: float, zoom: int) -> tuple[float, float]:
    """Web Mercator projection -> world pixel coords at zoom level."""
    n = 256 * (2 ** zoom)
    x = (lng + 180.0) / 360.0 * n
    lat_rad = math.radians(lat)
    y = (1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n
    return x, y


CX, CY = project_world(CENTER_LAT, CENTER_LNG, ZOOM)


def latlng_to_image_pixel(lat: float, lng: float) -> tuple[float, float]:
    px, py = project_world(lat, lng, ZOOM)
    map_x = px - CX + MAP_WIDTH / 2.0
    map_y = py - CY + MAP_HEIGHT / 2.0
    return MAP_X + map_x, MAP_Y + map_y


def closest_zone(rgb: tuple[int, int, int], threshold: float = 100.0) -> str | None:
    best = None
    best_dist = float("inf")
    for zone, color in ZONE_COLORS.items():
        dist = math.sqrt(sum((a - b) ** 2 for a, b in zip(rgb, color)))
        if dist < best_dist:
            best_dist = dist
            best = zone
    if best_dist > threshold:
        return None
    return best


def sample_zone(
    img: Image.Image,
    x: float,
    y: float,
    radius: int = 8,
    min_zone_pixels: int = 12,
) -> str | None:
    """Sample a (2*radius+1)^2 box around (x,y). Return the dominant
    non-BLACK zone color only if at least `min_zone_pixels` pixels match.
    Filters out unpainted levee lines (which only contribute ~radius*2 line
    pixels and would never reach min_zone_pixels for a real zone color).
    """
    counts: Counter[str] = Counter()
    ix, iy = int(round(x)), int(round(y))
    for dx in range(-radius, radius + 1):
        for dy in range(-radius, radius + 1):
            sx, sy = ix + dx, iy + dy
            if 0 <= sx < img.width and 0 <= sy < img.height:
                rgb = img.getpixel((sx, sy))
                if isinstance(rgb, int):
                    rgb = (rgb, rgb, rgb)
                z = closest_zone(rgb)
                if z:
                    counts[z] += 1
    if not counts or counts.most_common(1)[0][1] < min_zone_pixels:
        return None
    return counts.most_common(1)[0][0]


def iter_line_points(geom: dict, n_samples: int = 7):
    """Yield (lng, lat) sample points along the line geometry."""
    coords = geom["coordinates"]
    geom_type = geom["type"]

    def sample_line(line):
        # line is a list of [lng, lat]
        if not line:
            return
        if len(line) == 1:
            yield line[0][0], line[0][1]
            return
        # sample n_samples evenly spaced
        for i in range(n_samples):
            t = i / (n_samples - 1)
            idx = t * (len(line) - 1)
            i0 = int(idx)
            frac = idx - i0
            if i0 >= len(line) - 1:
                yield line[-1][0], line[-1][1]
            else:
                a = line[i0]
                b = line[i0 + 1]
                yield (
                    a[0] + (b[0] - a[0]) * frac,
                    a[1] + (b[1] - a[1]) * frac,
                )

    if geom_type == "LineString":
        yield from sample_line(coords)
    elif geom_type == "MultiLineString":
        for line in coords:
            yield from sample_line(line)


def classify_feature(img: Image.Image, feature: dict) -> str | None:
    """Classify a hurricane feature by sampling along its line."""
    # River features always go to BLACK (handled by caller)
    counts: Counter[str] = Counter()
    for lng, lat in iter_line_points(feature["geometry"], n_samples=15):
        x, y = latlng_to_image_pixel(lat, lng)
        z = sample_zone(img, x, y)
        if z:
            counts[z] += 1
    if not counts:
        return None
    return counts.most_common(1)[0][0]


def main():
    levee_path = REPO / "public/data/levee-centerline.json"
    image_path = REPO / "grass-cutting-blank-basemap.png"
    out_path = REPO / "public/data/grass-cutting-zones.json"

    print(f"Loading levees from {levee_path}")
    with open(levee_path) as f:
        levees = json.load(f)
    features = levees["features"]
    print(f"  {len(features)} features")

    print(f"Loading image from {image_path}")
    img = Image.open(image_path).convert("RGB")
    print(f"  size: {img.size}")

    mapping: dict[int, str] = {}
    for feature in features:
        oid = feature["properties"].get("OBJECTID_1")
        if oid is None:
            continue
        props = feature["properties"]
        # River features always BLACK (Upper Protection)
        if props.get("RiverFl") == "Y":
            mapping[oid] = "BLACK"
            continue
        # Hurricane features classified by sampling user's painted colors
        if props.get("HurricaneF") == "Y":
            zone = classify_feature(img, feature)
            if zone:
                mapping[oid] = zone

    counts = Counter(mapping.values())
    print(f"\nClassified {len(mapping)} of {len(features)} features")
    for zone in ["BLACK", *ZONE_COLORS.keys()]:
        print(f"  {zone}: {counts.get(zone, 0)}")
    print(f"  unassigned: {len(features) - len(mapping)}")

    print(f"\nWriting mapping to {out_path}")
    with open(out_path, "w") as f:
        json.dump(mapping, f)
    print("done")


if __name__ == "__main__":
    main()
