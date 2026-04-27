"""Find the actual zone colors the user painted in their image."""

from collections import Counter
from PIL import Image

img = Image.open("/Users/OscarBoochever/Development/fpa/grass-cutting-blank-basemap.png").convert("RGB")
print(f"Image: {img.size}")

# Cluster colors by how saturated/distinct they are vs the basemap (cream/white/light)
# Basemap is mostly RGB with all values >200 and low saturation
# Zone paints are saturated colors

distinct_colors: Counter[tuple[int, int, int]] = Counter()
for y in range(img.height):
    for x in range(img.width):
        r, g, b = img.getpixel((x, y))
        # Filter out basemap-like (light/desaturated) and pure water (light blue cream)
        max_c = max(r, g, b)
        min_c = min(r, g, b)
        saturation = (max_c - min_c) / 255.0
        # Keep colors that are saturated OR very dark (BLACK zone)
        if saturation > 0.4 or max_c < 60:
            # Quantize to reduce noise
            qr, qg, qb = (r // 16) * 16, (g // 16) * 16, (b // 16) * 16
            distinct_colors[(qr, qg, qb)] += 1

print(f"\nTop 25 painted-like colors (quantized to /16):")
for color, count in distinct_colors.most_common(25):
    print(f"  RGB{color}: {count}")
