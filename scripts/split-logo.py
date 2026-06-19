#!/usr/bin/env python3
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit('Pillow required: pip install Pillow')

src = Path(
    '/mnt/c/Users/patgu/.cursor/projects/wsl-localhost-Ubuntu-24-04-home-guettlerpj-dev-guardian-md/assets/'
    'c__Users_patgu_AppData_Roaming_Cursor_User_workspaceStorage_0b3b7342c118403c63d1ceae7fd9b150_images_'
    'image-8692f37c-d1b8-4188-913e-fe2eda6ae4d1.png'
)
out = Path(__file__).resolve().parent.parent / 'public'
out.mkdir(parents=True, exist_ok=True)

im = Image.open(src).convert('RGBA')
w, h = im.size
mid = w // 2
light = im.crop((0, 0, mid, h))
dark = im.crop((mid, 0, w, h))
light.save(out / 'logo-light.png')
dark.save(out / 'logo-dark.png')
print(f'Split {w}x{h} -> {out / "logo-light.png"}, {out / "logo-dark.png"}')
