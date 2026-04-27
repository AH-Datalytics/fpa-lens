"""Debug projection: find pixel positions for known cities."""

import math
from PIL import Image

img = Image.open("/Users/OscarBoochever/Development/fpa/grass-cutting-blank-basemap.png").convert("RGB")
print(f"Image: {img.size}")


def project(lat, lng, zoom=11):
    n = 256 * (2 ** zoom)
    x = (lng + 180) / 360 * n
    lat_rad = math.radians(lat)
    y = (1 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2 * n
    return x, y


CX, CY = project(29.99, -90.0)
print(f"Center world coords: ({CX:.1f}, {CY:.1f})")

# Map element rect within image
MAP_X, MAP_Y, MAP_W, MAP_H = 33, 81, 1198, 498

# Known landmarks (approximate centers from common knowledge)
LANDMARKS = {
    "Kenner area": (30.02, -90.24),
    "Metairie center": (30.00, -90.16),
    "New Orleans (CBD)": (29.95, -90.07),
    "Chalmette center": (29.94, -89.96),
    "Lakefront Airport": (30.04, -90.03),
    "MR curve south of city": (29.92, -90.04),
}


def latlng_to_pixel(lat, lng):
    px, py = project(lat, lng)
    return MAP_X + px - CX + MAP_W / 2, MAP_Y + py - CY + MAP_H / 2


for name, (lat, lng) in LANDMARKS.items():
    x, y = latlng_to_pixel(lat, lng)
    print(f"  {name}: lat={lat}, lng={lng} -> pixel ({x:.1f}, {y:.1f})")
