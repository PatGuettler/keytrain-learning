#!/usr/bin/env python3
"""Process KeyTrain Learning logo images.

Splits the combined source (two logos side by side separated by a thin
gray divider line down the center seam), keys out the white / near-white
background (negative-space effect), auto-trims transparent borders, adds
uniform transparent padding, and writes the light/dark logos plus matching
favicons.

The divider line is gray (not white) so it survives the white-key. To stop
it bleeding into the inner edge of each half (which threw off auto-crop
centering), we INSET away from the center seam when splitting.
"""
import os
import shutil
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMBINED = (
    "/mnt/c/Users/patgu/.cursor/projects/"
    "wsl-localhost-Ubuntu-24-04-home-guettlerpj-dev-keytrain-learning/assets/"
    "c__Users_patgu_AppData_Roaming_Cursor_User_workspaceStorage_"
    "0b3b7342c118403c63d1ceae7fd9b150_images_"
    "image-8692f37c-d1b8-4188-913e-fe2eda6ae4d1.png"
)

THRESHOLD = 240    # R,G,B all >= this become transparent
PAD_FRAC = 0.06    # transparent padding added back, fraction of cropped size
SEAM_INSET = 12    # px to inset away from the center divider line
EDGE_INSET = 8     # px to inset from outer edges (safe: logo is centered)


def key_white(img):
    """Return an RGBA copy with white/near-white pixels made transparent."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
                px[x, y] = (r, g, b, 0)
    return img


def process(src_img, out_path):
    """Key, trim, pad and save a single logo."""
    img = key_white(src_img)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    w, h = img.size
    pad = int(round(max(w, h) * PAD_FRAC))
    canvas = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    canvas.paste(img, (pad, pad), img)
    canvas.save(out_path, "PNG")
    return canvas


def verify(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    corners = [
        img.getpixel((0, 0)),
        img.getpixel((w - 1, 0)),
        img.getpixel((0, h - 1)),
        img.getpixel((w - 1, h - 1)),
    ]
    corner_alphas = [c[3] for c in corners]

    left_col_clear = all(img.getpixel((0, y))[3] == 0 for y in range(h))
    right_col_clear = all(img.getpixel((w - 1, y))[3] == 0 for y in range(h))
    top_row_clear = all(img.getpixel((x, 0))[3] == 0 for x in range(w))
    bottom_row_clear = all(img.getpixel((x, h - 1))[3] == 0 for x in range(w))

    cx, cy = w // 2, h // 2
    win = max(2, min(w, h) // 4)
    opaque_center = False
    for y in range(max(0, cy - win), min(h, cy + win)):
        for x in range(max(0, cx - win), min(w, cx + win)):
            if img.getpixel((x, y))[3] > 0:
                opaque_center = True
                break
        if opaque_center:
            break

    print("  " + path)
    print("    dimensions: {}x{}".format(w, h))
    print("    corner alphas: {} (all transparent: {})".format(
        corner_alphas, all(a == 0 for a in corner_alphas)))
    print("    outer columns clear (L/R): {} / {}".format(
        left_col_clear, right_col_clear))
    print("    outer rows clear (T/B): {} / {}".format(
        top_row_clear, bottom_row_clear))
    print("    opaque colored pixels in center: {}".format(opaque_center))


def main():
    combined = Image.open(COMBINED).convert("RGBA")
    W, H = combined.size
    mid = W // 2

    # Left half (teal -> light theme): exclude divider on its right edge.
    #   For a 600x600 source: crop (8, 8, 288, 592)
    left = combined.crop(
        (EDGE_INSET, EDGE_INSET, mid - SEAM_INSET, H - EDGE_INSET))
    # Right half (slate -> dark theme): exclude divider on its left edge.
    #   For a 600x600 source: crop (312, 8, 592, 592)
    right = combined.crop(
        (mid + SEAM_INSET, EDGE_INSET, W - EDGE_INSET, H - EDGE_INSET))

    print("Source: {}x{} (mid={})".format(W, H, mid))
    print("Left crop box:  {}".format(
        (EDGE_INSET, EDGE_INSET, mid - SEAM_INSET, H - EDGE_INSET)))
    print("Right crop box: {}".format(
        (mid + SEAM_INSET, EDGE_INSET, W - EDGE_INSET, H - EDGE_INSET)))

    light_out = os.path.join(REPO, "src/assets/logo-light.png")
    dark_out = os.path.join(REPO, "src/assets/logo-dark.png")
    os.makedirs(os.path.dirname(light_out), exist_ok=True)
    process(left, light_out)
    process(right, dark_out)

    os.makedirs(os.path.join(REPO, "public"), exist_ok=True)
    shutil.copyfile(light_out, os.path.join(REPO, "public/favicon-light.png"))
    shutil.copyfile(dark_out, os.path.join(REPO, "public/favicon-dark.png"))

    print("Verification:")
    verify(light_out)
    verify(dark_out)
    print("Favicons:")
    verify(os.path.join(REPO, "public/favicon-light.png"))
    verify(os.path.join(REPO, "public/favicon-dark.png"))


if __name__ == "__main__":
    main()