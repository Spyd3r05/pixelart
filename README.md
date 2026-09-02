# PIXEL ART MAKER
A desktop-first browser app for detailed pixel art, charted crochet patterns, and tapestry-style grid work. It is designed to feel closer to Stitch Fiddle and other pattern-planning tools while staying lightweight and easy to use in a browser.

## What this editor includes
- Large desktop canvas with a grid sized to take up most of the viewport
- Draw mode and progress-tracker mode for project planning and row-by-row tracking
- Custom width and height controls for grid dimensions
- Keyboard shortcuts for undo/redo with Ctrl+Z and Ctrl+Y
- Side and top/bottom numbering with alternating parity for easy pattern tracking
- Artwork persistence when resizing the grid without expanding the original design unexpectedly
- Directional canvas expansion and cropping with 9-anchor positioning
- Image import and trace mode — load a reference image, nudge it into place, and adjust opacity to trace your patterns
- PNG export that includes the pixel art plus the numbered guide sheet for pattern reference

## Features
- Pen tool — click and drag to paint cells
- Eraser tool — clear cells back to white
- Fill tool — flood-fill contiguous regions
- Progress tracker — click a row to highlight it and dim the rest of the grid
- Color palette — preset swatches plus a custom color picker
- Color picker modal — press `C` to open an aligned, labeled palette without scrolling
- Preset and custom grid sizing — 16x16, 32x32, 64x64, 96x96, 128x128, and custom dimensions
- Canvas expansion/cropping — use the 9-anchor selector to expand or crop your canvas from any edge or corner
- Image tracing — import a PNG/JPG, toggle "Trace Image" mode, and use arrow keys to nudge alignment and `+`/`-` to adjust opacity
- Undo/redo history — save the previous artwork state before each editing action
- Local save — keep the project in the browser between sessions until the user explicitly deletes it
- Delete Saved Work — permanently clear the stored artwork and reset to a blank 32x32 grid
- PNG export — download a numbered pattern sheet built for crochet, tapestry, and pixel reference work

## Future pixel art features to explore
The editor already supports a strong drawing workflow, but there are many upgrades that would make it even more useful for detailed art, animation, and pattern planning. This list is a working roadmap for future changes.

- Mirror and flip tools — horizontally, vertically, and diagonally mirror the selected pixels or the whole canvas.
- Symmetry drawing — enable horizontal, vertical, or quadrant symmetry while painting to speed up character and motif design.
- Shape tools — draw rectangles, ellipses, lines, and perfect circles with adjustable stroke widths.
- Selection tools — click-drag to select an area, then move, copy, duplicate, or clear it.
- Eyedropper tool — sample a color directly from any painted pixel on the grid.
- Color replacement — recolor all matching pixels in a region or across the whole canvas.
- Layer support — add multiple editable layers for character art, shading, and guide overlays.
- Animation frames — create sprite sheets or short looping frame sequences for game art and pixel motion tests.
- Palette management — save named custom swatches, import/export palettes, and organize favorite colors.
- Zoom and pan controls — zoom into large projects and navigate oversized art without losing precision.
- Grid overlays and snap guides — display rulers, crosshair guides, and alignment lines for exact placement.
- Transparency and alpha editing — use checkerboard backgrounds and semi-transparent colors for layered effects.
- Tile repeat and seamless pattern tools — preview tiled patterns and repeat art across a larger canvas.
- Dithering and gradient fills — add texture and shading options for soft gradients and low-color scenes.
- Reference image overlay — load a photo or concept sheet and trace it directly on top of the grid.
- Import/export project files — save artwork as JSON or indexed pixel data for easier project portability.

## Desktop workflow
This project is optimized for laptop and desktop use first. Every grid uses fixed 44px squares, twice the original 22px baseline, so cells never become cramped or unreadable. Larger grids extend beyond the available viewport and can be scrolled horizontally and vertically while keeping all numbered guides visible.

## How to run
Clone the repository:
```bash
git clone https://github.com/Spyd3r05/pixelart.github.io.git
```

Open the project folder and run it with a local web server, or open `index.html` in a browser if preferred:
```bash
cd pixel-art-maker
python -m http.server 8000
```
Then visit `http://localhost:8000`.

## Keyboard shortcuts
- `P` — pen tool
- `E` — eraser tool
- `F` — fill tool
- `D` — draw mode
- `C` — Color Swatches
- `G` — progress tracker mode
- `Arrow Keys` (in trace mode) — nudge image
- `+` / `-` (in trace mode) — adjust opacity
- `Ctrl/Cmd + Z` — undo
- `Ctrl/Cmd + Y` — redo

## Notes for pattern work
- Numbers alternate on the grid edges, with odd values on the right and even values on the left; top and bottom rows follow the same alternating pattern.
- When changing grid size, use the anchor selector (the 3x3 grid) to decide which corner or side your artwork should stick to while the rest of the canvas expands or crops.
- Exported PNGs are designed to be printed or referenced while stitching or tracing the pattern.

## License
All rights preserved.
