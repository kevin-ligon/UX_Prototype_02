---
name: crop-icons
description: Aggressively crop individual icons/assets from screenshot images, removing all unnecessary pixels and making backgrounds transparent. Saves results to images/ with descriptive names.
---

# Crop Icons from Screenshots

Extract individual icons and small assets from reference screenshots. Aggressively crop to the tightest possible bounding box and make all non-essential pixels transparent.

## Workflow

### Step 1 — Gather inputs

Use `AskUserQuestion` to collect anything not provided:

- **Source image path** — the screenshot to crop from.
- **What to crop** — list of icons/elements the user wants extracted. If unclear, view the image first and ask the user to confirm which elements to extract.
- **Naming** — if unsure what to name an icon, ask. Names should be descriptive and lowercase with underscores (e.g., `attack_sword.png`, `shield_icon.png`, `gold_coin.png`).

### Step 2 — Analyze the source image

Get exact pixel dimensions:

```
python3 -c "from PIL import Image; img=Image.open(r'<path>'); print(img.size)"
```

View the image with the `Read` tool to identify each icon's approximate location. Note bounding boxes as `(left, top, right, bottom)` pixel coordinates.

### Step 3 — Generate and run the crop script

Write a Python script that:

1. Opens the source image.
2. Crops each icon to its bounding rectangle.
3. **Aggressively removes background** — always apply at least one transparency technique:
   - **Color-key first**: Sample the dominant background color around the icon. Remove pixels within tolerance and auto-trim.
   - **Polygon mask**: If the icon has an irregular shape on a non-uniform background, trace the outline.
   - **`rembg`**: Last resort for complex art with no clean background.
4. **Auto-trims** every result — call `getbbox()` and re-crop to remove any remaining transparent padding.
5. Saves to `images/` as PNG with alpha channel.

Template:

```python
import os
from PIL import Image, ImageDraw

SOURCE = r"<path to screenshot>"
OUT_DIR = "images"

# (left, top, right, bottom) — pixel coordinates in the source image
ICONS = {
    "<icon_name>.png": (x1, y1, x2, y2),
}

# Per-icon post-processing. Every icon should have at least colorkey + trim.
POST = {
    "<icon_name>.png": {"colorkey": (R, G, B), "tolerance": 30, "trim": True},
}

def apply_colorkey(img, target, tol):
    img = img.convert("RGBA")
    tr, tg, tb = target
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if abs(r-tr) <= tol and abs(g-tg) <= tol and abs(b-tb) <= tol:
                px[x, y] = (0, 0, 0, 0)
    return img

def apply_polygon(img, points):
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    img.putalpha(mask)
    return img

def auto_trim(img):
    img = img.convert("RGBA")
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    src = Image.open(SOURCE)
    print(f"Source size: {src.size}")
    for name, box in ICONS.items():
        try:
            cropped = src.crop(box)
            opts = POST.get(name, {"trim": True})
            if "colorkey" in opts:
                cropped = apply_colorkey(cropped, opts["colorkey"], opts.get("tolerance", 25))
            if "polygon" in opts:
                cropped = apply_polygon(cropped, opts["polygon"])
            if opts.get("trim", True):
                cropped = auto_trim(cropped)
            cropped.save(os.path.join(OUT_DIR, name))
            print(f"  ok  {name} ({cropped.size[0]}x{cropped.size[1]})")
        except Exception as e:
            print(f"  FAIL {name}: {e}")

if __name__ == "__main__":
    main()
```

Run with:
```
python3 <script_path>
```

### Step 4 — Verify results

View each cropped icon with the `Read` tool. Check:

- **Tight crop**: No unnecessary transparent padding remains.
- **Clean transparency**: Background is fully removed, no halo or fringe pixels.
- **Correct content**: The icon contains exactly what was intended, no adjacent UI bleeding in.

If any icon is wrong, adjust coordinates or post-processing and re-run. Iterate until every icon is clean.

### Step 5 — Report results

List each saved icon with its path, dimensions, and a brief description. Example:

```
Saved to images/:
- attack_sword.png (48x52) — melee attack icon
- gold_coin.png (32x32) — currency icon
```

## Key principles

- **Aggressive cropping** — always trim to the tightest possible bounding box. No lazy rectangles with wasted space.
- **Transparency by default** — every icon gets background removal. Never save an icon with its original rectangular background intact.
- **Ask before naming** — if there's any ambiguity about what an icon represents, ask the user before saving.
- **images/ is the output directory** — all cropped icons go here, flat (no subdirectories unless the user requests organization).
