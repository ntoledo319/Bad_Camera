"""Generate a synthetic demonstration photo (illustration, not a real sighting) with
deliberately sensitive EXIF (GPS, device make/model, timestamp) to test metadata removal."""
from PIL import Image, ImageDraw
import sys
W, H = 1600, 1200
im = Image.new("RGB", (W, H))
d = ImageDraw.Draw(im)
for y in range(H):
    t = y / H
    d.line([(0, y), (W, y)], fill=(int(170 + 60 * t), int(200 + 30 * t), int(225 + 10 * t)))
d.rectangle([0, 860, W, H], fill=(96, 104, 98))
d.rectangle([0, 840, W, 870], fill=(150, 150, 140))
for x in range(0, W, 160):
    d.rectangle([x + 30, 1010, x + 110, 1022], fill=(235, 228, 200))
d.ellipse([1050, 520, 1500, 900], fill=(70, 120, 80))
d.rectangle([700, 260, 724, 860], fill=(110, 112, 110))
d.polygon([(660, 230), (780, 230), (800, 262), (640, 262)], fill=(40, 48, 60))
d.rectangle([724, 380, 830, 470], fill=(32, 36, 40))
d.rectangle([800, 405, 836, 445], fill=(18, 20, 22))
d.ellipse([808, 413, 828, 437], fill=(60, 70, 90))
d.text((40, 40), "SYNTHETIC DEMO ILLUSTRATION - NOT A REAL SIGHTING", fill=(23, 38, 36))
exif = Image.Exif()
exif[0x010F] = "DemoMake"; exif[0x0110] = "DemoPhone 1"; exif[0x0132] = "2026:09:14 11:12:00"
gps = {1: "N", 2: (41.0, 8.0, 56.58), 3: "W", 4: (73.0, 15.0, 3.67)}
exif[0x8825] = gps
im.save(sys.argv[1], "JPEG", quality=90, exif=exif.tobytes())
print("ok")
