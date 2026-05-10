---
name: create-ui-from-image
description: Faithfully recreate a UI screenshot in HTML. Crops asset images via Pillow, generates a React/JSX screen inside strategy-map.html, and wires it into the cheat-menu UI preview list.
---

# Create UI from Image

Convert a reference UI screenshot into a pixel-faithful, interactive screen inside `strategy-map.html`. The screen becomes browseable through a "UI Previews" section in the existing cheat menu (settings cog on the player avatar).

## Workflow

### Step 1 — Gather inputs

Use `AskUserQuestion` to collect anything not already provided in the user's message:

- **UI name** (kebab-case) — used for folder name + view ID. Example: `troop-roster`.
- **Reference image path** — usually under `Reference images/`.
- **Where to add the access entry** — present 3 options, recommend the first:
  1. *Add to "UI Previews" list in the cheat menu (Recommended)*
  2. *Add a temporary button on the overworld*
  3. *Just create the view, I'll wire it up later*
- **Optional custom notes** — color overrides, layout deviations, intended interactions, things to ignore.

If the user already specified all of the above, skip this step.

### Step 2 — Set up the prototype folder

Create `ui_prototypes/<ui_name>/assets/` for cropped assets. The HTML output goes into `strategy-map.html`, NOT a standalone HTML file. Assets stay self-contained per UI.

### Step 3 — Analyze the reference image

First, get the **exact pixel dimensions** of the reference (do NOT eyeball this — actually measure):

```
"C:/Users/JamesFielding/AppData/Local/Programs/Python/Python312/python.exe" -c "from PIL import Image; img=Image.open(r'<path>'); print(img.size)"
```

Record the dimensions and aspect ratio (`width / height`). Compare to the app container:
- `strategy-map.html` `#root` is locked to **16:9** (≈1.778:1).
- If the reference aspect != 16:9, you MUST use an aspect-locked wrapper (Step 6) — otherwise `background-size: cover` will crop the sides and `100% 100%` will distort. Both break overlay positioning.

Then list every distinct UI element you see, classifying each:

- **Crop from image** (PNG asset) — textured/illustrated elements: character art, building art, ornate decorative frames, complex backgrounds.
- **Build as inline SVG** — simple icons, geometric shapes, badges, arrows.
- **Build with CSS/Tailwind only** — gradients, panels, borders, basic shapes, text styling.

Write the classification + dimensions down before writing any code. This becomes your build plan.

### Step 4 — Generate the Python crop script

Use `skills/script/crop_assets.py.txt` as the template. Write a fresh script to `ui_prototypes/<ui_name>/crop.py`:

```python
import os
from PIL import Image, ImageDraw

REFERENCE = "<absolute or project-relative path to the reference image>"
OUT_DIR = "ui_prototypes/<ui_name>/assets"

# (left, top, right, bottom) — pixel coordinates in the reference image
ASSETS = {
    "ui_btn_base.png": (35, 235, 100, 300),
    # ... one entry per cropped asset from Step 3 ...
}

# Optional: per-asset post-processing for non-rectangular shapes.
# Keys must match an entry in ASSETS. See "Shaped crops" below for techniques.
POST = {
    # Example — make a near-purple background transparent and auto-trim the result:
    # "factory_building.png": {"colorkey": (30, 25, 65), "tolerance": 30, "trim": True},
    # Example — apply a polygon mask (relative to the cropped rect):
    # "shield_icon.png": {"polygon": [(0,5),(60,0),(60,80),(0,80)]},
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

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    img = Image.open(REFERENCE)
    print(f"Reference size: {img.size}")
    for name, box in ASSETS.items():
        try:
            cropped = img.crop(box)
            opts = POST.get(name, {})
            if "colorkey" in opts:
                cropped = apply_colorkey(cropped, opts["colorkey"], opts.get("tolerance", 25))
            if "polygon" in opts:
                cropped = apply_polygon(cropped, opts["polygon"])
            if opts.get("trim"):
                bbox = cropped.getbbox()
                if bbox:
                    cropped = cropped.crop(bbox)
            cropped.save(os.path.join(OUT_DIR, name))
            print(f"  ok  {name}")
        except Exception as e:
            print(f"  FAIL {name}: {e}")

if __name__ == "__main__":
    main()
```

Estimate pixel coordinates from the reference image dimensions (the `Read` tool shows the image; eyeball relative positions and translate to pixels using the known image width/height).

#### Shaped crops (non-rectangular, transparent backgrounds)

PIL's `crop()` only takes a rectangular bbox. For shaped cuts, you crop the bounding rect first, then apply alpha transparency. The output PNG stays rectangular but pixels outside the shape are transparent. Three techniques, ordered by effort:

- **Color-key (chroma key)** — best for game UI on a near-uniform background (e.g. a beige building on a flat purple panel). Pick an RGB value from the bg and a tolerance; pixels within range become transparent. Often combined with `trim: True` to auto-shrink to tight bounds. Useful when a crop accidentally captures corner artifacts (e.g. an adjacent rank diamond bleeding in) — color-key wipes them out cleanly if they don't share the bg color.

- **Polygon mask** — for arbitrary outlines (rotated rectangles, hexagons, traced shapes). Define vertices in coordinates relative to the cropped rect's top-left, then `ImageDraw.polygon()` produces the alpha mask. Use this when the artwork has no clean background color but you can hand-trace the silhouette.

- **ML background removal (`rembg`)** — last resort for complex art with no clean color and no traceable outline. Requires installing the `rembg` package (uses a small ML model). Heavyweight but accurate.

When to reach for which: try a rectangular crop first. If artifacts appear at the corners and the bg is near-uniform, add color-key. If the desired shape is non-rectangular by design (a diamond badge, a slanted banner), use a polygon mask. Only consider `rembg` if both fail.

### Step 5 — Run the crop script

Plain `python` is not on PATH in fresh shells — use the full path:

```
"C:/Users/JamesFielding/AppData/Local/Programs/Python/Python312/python.exe" ui_prototypes/<ui_name>/crop.py
```

Pillow is already installed.

After it runs, view 1–2 of the cropped assets with the `Read` tool to verify they captured the right region. If a crop is off, refine the bounding box in the script and re-run. Iterate until all crops look right.

Also check for **corner artifacts** — if the rectangular bbox accidentally caught a piece of an adjacent UI element (e.g. a banner edge, a neighboring card's border), don't just keep tightening the rectangle to make it disappear. Add a `POST` entry with `colorkey` (Step 4 "Shaped crops") to wipe the artifact while keeping the asset's full silhouette intact.

### Step 6 — Build the JSX view inside strategy-map.html

Add a new component function near the other screens (search for `function BaseScreen` to find the section).

**Critical: aspect-locked wrapper.** If the reference image's aspect ratio doesn't match the app container (16:9), wrap the bg in an inner div locked to the reference's aspect ratio. UI overlays go inside this wrapper — their `%` positions then map directly to the image's pixel positions. Without this, overlays drift because `background-size: cover` zooms/crops the bg.

```jsx
function UIPreview_<UiName>({onBack, ...}){
  const REF_W = <imageWidthPx>, REF_H = <imageHeightPx>;
  return <div className="absolute inset-0 select-none bg-black flex items-center justify-center overflow-hidden">
    {onBack && <button onClick={onBack} className="absolute top-2 left-2 z-40 w-9 h-9 rounded-full bg-slate-900/85 border border-slate-500/70 flex items-center justify-center text-white hover:border-white transition-all active:scale-95" title="Back">
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>}
    {/* Aspect-locked wrapper — fits inside parent without distortion or crop. */}
    <div className="relative" style={{aspectRatio:`${REF_W} / ${REF_H}`,width:"100%",maxHeight:"100%",maxWidth:"100%"}}>
      <img src="ui_prototypes/<ui_name>/assets/bg.png" alt="..." className="absolute inset-0 w-full h-full pointer-events-none" draggable="false"/>
      {/* All overlays here. Use top/left/right/bottom in % — they now map to the reference image directly. */}
    </div>
  </div>;
}
```

Rules:
- Use Tailwind utility classes (already loaded via CDN).
- Reference cropped assets via `ui_prototypes/<ui_name>/assets/<file>.png`.
- Inline SVGs for simple icons (don't generate SVG files).
- Match colors, spacing, typography of the reference as faithfully as possible. Pull hex values from the image directly.
- The component MUST accept and render an `onBack` button (top-left, matching the `BaseScreen` pattern). Place it OUTSIDE the aspect wrapper so it's always at the screen corner regardless of letterbox bars.
- Do NOT use `backgroundImage`/`backgroundSize: cover` for the reference image — use `<img>` inside the aspect wrapper instead. `cover` will crop or distort if aspects don't match.

### Step 7 — Add interactive polish

Every interactive element in the reference gets:
- `active:scale-95` press-down feedback
- A hover state (color shift or subtle scale via Tailwind `hover:` classes)
- Particle/shake/glow VFX where it would feel alive (reuse keyframes already defined in the `<style>` block at the top of `strategy-map.html`: `navShake`, `collectSparkle`, `statPop`, `battleMsg`, `tileRewardFloat`, `failFlash`, etc.)
- A `console.log` placeholder handler for buttons without defined behavior — never leave a button with no `onClick`.

### Step 8 — Wire into the cheat menu (default option)

Find the cheat menu in `strategy-map.html` (search `showCheats&&` — around line 586). Add a "UI Previews" section near the bottom of the menu if it doesn't exist:

```jsx
<div className="border-t border-slate-700/50 pt-4">
  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">UI Previews</h3>
  <div className="flex flex-col gap-2">
    <button onClick={()=>{setView("ui_<ui_name>");setShowCheats(false);}} className="w-full text-xs font-bold bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white rounded-lg py-2 transition-colors"><UI Name (Title Case)></button>
    {/* future entries appended here */}
  </div>
</div>
```

If the section already exists, just append a new `<button>` row inside it.

Add the matching render block alongside the other view conditionals (search around `view==="army"`):

```jsx
{view==="ui_<ui_name>" && <UIPreview_<UiName> onBack={()=>setView("overworld")}/>}
```

If the user picked option 2 (overworld button) or option 3 (no wiring), adapt accordingly.

### Step 9 — Verify in the browser

1. Refresh `http://localhost:3333/strategy-map.html` (or restart the static server if needed: `npx serve -l 3333 .`).
2. Open the cheat menu via the settings cog on the player avatar (top-left).
3. Click the new entry under "UI Previews".
4. Compare the rendered screen with the reference image side-by-side.
5. Test every interactive element — buttons should depress on click, hover states should react.
6. Back button returns to the overworld.

If the rendering deviates noticeably, iterate: refine JSX, re-crop assets, or adjust pixel positions until pixel-faithful. Don't claim done if it doesn't match.

## Conventions to remember

- Skill triggers when the user invokes `/create-ui-from-image` or asks to "recreate this UI" / "build this screen from a reference image".
- If the user says "use the existing skill" or references it indirectly, follow this workflow even without an explicit slash invocation.
- Never skip Step 9 — visual verification is the whole point.
- Asset paths in JSX are relative to `strategy-map.html` (project root), so `ui_prototypes/<ui_name>/assets/<file>.png` works directly.
