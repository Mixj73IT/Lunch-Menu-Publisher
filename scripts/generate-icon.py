#!/usr/bin/env python3
"""
Generate professional icon files for Lunch Menu Publisher.
Creates a multi-resolution ICO (32, 64, 128, 256) and PNG files.
"""

from PIL import Image, ImageDraw
import os

# Brand colors from PDF palette
BURGUNDY = (107, 29, 29)      # #6B1D1D
GOLD = (200, 164, 100)        # #C8A464
CREAM = (253, 248, 240)       # #FDF8F0
DARK = (60, 30, 20)           # #3C1E14


def draw_icon(size):
    """Draw a professional calendar-plate icon at the given size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Scale factor for responsive drawing
    s = size / 256.0
    r = int(24 * s)  # corner radius

    # Background: rounded square with burgundy
    margin = int(8 * s)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=r,
        fill=BURGUNDY,
    )

    # Inner border/glow in gold
    border = int(6 * s)
    draw.rounded_rectangle(
        [margin + border, margin + border, size - margin - border, size - margin - border],
        radius=max(r - border, 1),
        outline=GOLD,
        width=max(int(2 * s), 1),
    )

    # Calendar grid lines
    grid_top = int(70 * s)
    grid_bottom = int(210 * s)
    grid_left = int(50 * s)
    grid_right = int(206 * s)
    rows = 3
    cols = 3
    cell_w = (grid_right - grid_left) / cols
    cell_h = (grid_bottom - grid_top) / rows
    line_w = max(int(2 * s), 1)

    for i in range(cols + 1):
        x = grid_left + i * cell_w
        draw.line(
            [(x, grid_top), (x, grid_bottom)],
            fill=CREAM,
            width=line_w,
        )
    for j in range(rows + 1):
        y = grid_top + j * cell_h
        draw.line(
            [(grid_left, y), (grid_right, y)],
            fill=CREAM,
            width=line_w,
        )

    # Calendar header bar in gold
    header_h = int(30 * s)
    draw.rectangle(
        [grid_left, grid_top - header_h, grid_right, grid_top],
        fill=GOLD,
    )

    # Small circle dots in some cells (representing meals)
    dot_r = max(int(6 * s), 2)
    dot_positions = [(1, 1), (2, 0), (0, 2), (2, 2)]
    for cx, cy in dot_positions:
        cx = grid_left + (cx + 0.5) * cell_w
        cy = grid_top + (cy + 0.5) * cell_h
        draw.ellipse(
            [cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r],
            fill=GOLD,
        )

    # "LMP" letters at bottom if size is large enough
    if size >= 128:
        try:
            from PIL import ImageFont
            font_size = int(28 * s)
            font = ImageFont.truetype("arial.ttf", font_size)
            text = "LMP"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
            text_x = (size - text_w) // 2
            text_y = int(232 * s)
            draw.text((text_x, text_y), text, fill=CREAM, font=font)
        except Exception:
            pass

    return img


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons_dir = os.path.join(root, "src-tauri", "icons")
    images_dir = os.path.join(root, "images")

    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs(images_dir, exist_ok=True)

    # Generate PNG sizes for Tauri
    sizes = [32, 64, 128, 256]
    for size in sizes:
        img = draw_icon(size)
        png_path = os.path.join(icons_dir, f"icon_{size}x{size}.png")
        img.save(png_path, "PNG")
        print(f"Saved {png_path}")

    # Generate multi-resolution ICO
    ico_path = os.path.join(icons_dir, "icon.ico")
    imgs = [draw_icon(s) for s in sizes]
    imgs[0].save(ico_path, format="ICO", sizes=[(s, s) for s in sizes])
    print(f"Saved {ico_path}")

    # Also save a large PNG as the logo
    logo_path = os.path.join(images_dir, "logo.png")
    draw_icon(512).save(logo_path, "PNG")
    print(f"Saved {logo_path}")

    # Create SVG version for web favicon
    svg_path = os.path.join(images_dir, "icon.svg")
    with open(svg_path, "w") as f:
        f.write('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect x="8" y="8" width="240" height="240" rx="24" fill="#6B1D1D"/>
  <rect x="14" y="14" width="228" height="228" rx="18" fill="none" stroke="#C8A464" stroke-width="2"/>
  <rect x="50" y="40" width="156" height="30" fill="#C8A464"/>
  <line x1="50" y1="70" x2="206" y2="70" stroke="#FDF8F0" stroke-width="2"/>
  <line x1="50" y1="70" x2="50" y2="210" stroke="#FDF8F0" stroke-width="2"/>
  <line x1="102" y1="70" x2="102" y2="210" stroke="#FDF8F0" stroke-width="2"/>
  <line x1="154" y1="70" x2="154" y2="210" stroke="#FDF8F0" stroke-width="2"/>
  <line x1="206" y1="70" x2="206" y2="210" stroke="#FDF8F0" stroke-width="2"/>
  <line x1="50" y1="117" x2="206" y2="117" stroke="#FDF8F0" stroke-width="2"/>
  <line x1="50" y1="163" x2="206" y2="163" stroke="#FDF8F0" stroke-width="2"/>
  <line x1="50" y1="210" x2="206" y2="210" stroke="#FDF8F0" stroke-width="2"/>
  <circle cx="76" cy="93" r="6" fill="#C8A464"/>
  <circle cx="128" cy="140" r="6" fill="#C8A464"/>
  <circle cx="180" cy="93" r="6" fill="#C8A464"/>
  <circle cx="76" cy="186" r="6" fill="#C8A464"/>
  <text x="128" y="232" text-anchor="middle" fill="#FDF8F0" font-family="Arial, sans-serif" font-size="28" font-weight="bold">LMP</text>
</svg>''')
    print(f"Saved {svg_path}")

    print("\nDone! All icon files generated.")


if __name__ == "__main__":
    main()
