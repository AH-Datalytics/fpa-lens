"""Debug: sample colors from the user's marked image at known zone locations."""

from collections import Counter
from PIL import Image
import math

img = Image.open("/Users/OscarBoochever/Development/fpa/grass-cutting-blank-basemap.png").convert("RGB")
print(f"Image size: {img.size}")

# Reference zone colors from grassCutting.ts
REF_COLORS = {
    "BLACK": (31, 41, 55),
    "GREEN": (22, 163, 74),
    "LIGHT_BLUE": (56, 189, 248),
    "NAVY_BLUE": (30, 58, 138),
    "YELLOW": (250, 204, 21),
    "ORANGE": (234, 88, 12),
}


def project(lat, lng, zoom=11):
    n = 256 * (2 ** zoom)
    x = (lng + 180) / 360 * n
    lat_rad = math.radians(lat)
    y = (1 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2 * n
    return x, y


CX, CY = project(29.99, -90.0)
MAP_X, MAP_Y, MAP_W, MAP_H = 33, 81, 1198, 498


def latlng_to_pixel(lat, lng):
    px, py = project(lat, lng)
    return MAP_X + px - CX + MAP_W / 2, MAP_Y + py - CY + MAP_H / 2


# Approximate centroids of each painted zone (from the marked image)
KNOWN_LOCATIONS = {
    "BLACK (south MR curve)": (29.93, -90.04),
    "GREEN (Florida Ave)": (29.97, -90.02),
    "LIGHT_BLUE (south band)": (29.95, -89.95),
    "NAVY_BLUE (Lakefront west)": (30.03, -90.10),
    "YELLOW (east lakefront)": (30.04, -89.99),
    "ORANGE (NO East perimeter)": (30.06, -89.94),
}

print("\nSampling pixel colors at known zone locations:")
for name, (lat, lng) in KNOWN_LOCATIONS.items():
    x, y = latlng_to_pixel(lat, lng)
    ix, iy = int(round(x)), int(round(y))
    print(f"\n{name} at lat={lat}, lng={lng} -> pixel ({ix}, {iy})")
    # Sample a 21x21 area
    counts: Counter[tuple[int, int, int]] = Counter()
    for dx in range(-10, 11):
        for dy in range(-10, 11):
            if 0 <= ix + dx < img.width and 0 <= iy + dy < img.height:
                rgb = img.getpixel((ix + dx, iy + dy))
                counts[rgb] += 1
    # Print top 5 most common
    print("  Top 5 colors in 21x21 box:")
    for rgb, count in counts.most_common(5):
        # find closest reference zone
        best_zone = None
        best_dist = float("inf")
        for zone, ref in REF_COLORS.items():
            d = math.sqrt(sum((a - b) ** 2 for a, b in zip(rgb, ref)))
            if d < best_dist:
                best_dist = d
                best_zone = zone
        print(f"    {rgb} (count={count}) -> closest: {best_zone} (dist={best_dist:.1f})")
