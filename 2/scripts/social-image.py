"""Reproduce the sharing JPEG from the unchanged homepage artwork.

Run with Python 3 and Pillow: python3 scripts/social-image.py
This optional asset-authoring step is not part of the Node/Pages build.
"""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent
source = root / "web/_player/heritage-desert.webp"
target = root / "web/_player/social-heritage-v1.jpg"
with Image.open(source) as original:
    artwork = ImageOps.contain(original.convert("RGB"), (1200, 630), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (1200, 630), "#edd5b2")
    canvas.paste(artwork, ((1200 - artwork.width) // 2, (630 - artwork.height) // 2))
    canvas.save(target, "JPEG", quality=88, optimize=True, progressive=True)
print(f"{target.relative_to(root)}: {target.stat().st_size:,} bytes, 1200 × 630")
