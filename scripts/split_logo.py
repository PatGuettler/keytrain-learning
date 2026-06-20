from PIL import Image
import os
SOURCE = "/mnt/c/Users/patgu/.cursor/projects/wsl-localhost-Ubuntu-24-04-home-guettlerpj-dev-keytrain-learning/assets/c__Users_patgu_AppData_Roaming_Cursor_User_workspaceStorage_0b3b7342c118403c63d1ceae7fd9b150_images_image-8692f37c-d1b8-4188-913e-fe2eda6ae4d1.png"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
img = Image.open(SOURCE)
w, h = img.size
mid = w // 2
light = img.crop((0, 0, mid, h))
dark = img.crop((mid, 0, w, h))
for rel, im in [
    ("src/assets/logo-light.png", light),
    ("src/assets/logo-dark.png", dark),
    ("public/favicon-light.png", light),
    ("public/favicon-dark.png", dark),
]:
    p = os.path.join(ROOT, rel)
    im.save(p, "PNG")
    print(p, im.size[0], im.size[1], os.path.getsize(p), sep="\t")
print("SOURCE", w, h, sep="\t")
