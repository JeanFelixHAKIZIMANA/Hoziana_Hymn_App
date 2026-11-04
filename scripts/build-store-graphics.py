"""Builds the Google Play icon (512x512) and feature graphic (1024x500) from the app's assets.

Run from the repository root: python3 scripts/build-store-graphics.py
Needs Pillow and node_modules (for the fonts). Writes to store/google-play/.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = 'store/google-play'
FONTS = 'node_modules/@expo-google-fonts'
BG = (20, 19, 18)  # dark background, same as the app's dark theme
TEXT = (236, 232, 225)
MUTED = (163, 157, 147)
ACCENT = (169, 172, 245)

# 512x512 icon: Play wants a full square (it rounds the corners itself), no transparency.
Image.open('assets/icon.png').convert('RGB').resize((512, 512), Image.LANCZOS).save(f'{OUT}/icon-512.png')

# 1024x500 feature graphic: logo, name and a glimpse of the reader.
W, H = 1024, 500
img = Image.new('RGB', (W, H), BG)

# A faint indigo wash, like the app's glass background.
wash = Image.new('RGB', (W, H), BG)
ImageDraw.Draw(wash).ellipse((520, -200, 1300, 560), fill=(44, 44, 86))
img = Image.blend(img, wash.filter(ImageFilter.GaussianBlur(120)), 0.6)

logo = Image.open('assets/splash-logo-dark.png').convert('RGBA').resize((210, 210), Image.LANCZOS)
img.paste(logo, (50, (H - 210) // 2), logo)

d = ImageDraw.Draw(img)
serif = ImageFont.truetype(f'{FONTS}/source-serif-4/600SemiBold/SourceSerif4_600SemiBold.ttf', 64)
sans = ImageFont.truetype(f'{FONTS}/inter/400Regular/Inter_400Regular.ttf', 22)
sans_med = ImageFont.truetype(f'{FONTS}/inter/500Medium/Inter_500Medium.ttf', 18)
x = 296
d.text((x, 150), 'KORALI HOZIYANA', font=sans_med, fill=ACCENT)
d.text((x, 178), 'Hoziana', font=serif, fill=TEXT)
d.text((x, 268), '136 hymns, on your phone.', font=sans, fill=TEXT)
d.text((x, 302), 'Read offline. Search. Keep favourites.', font=sans, fill=MUTED)

# The dark reader screenshot, cropped like a phone peeking in from the right.
shot = Image.open(f'{OUT}/screenshots/5-reader-dark.png').convert('RGB')
pw = 220
ph = int(shot.height * pw / shot.width)
shot = shot.resize((pw, ph), Image.LANCZOS)
frame = Image.new('RGBA', (pw + 16, ph + 16), (0, 0, 0, 0))
ImageDraw.Draw(frame).rounded_rectangle((0, 0, pw + 15, ph + 15), radius=36, fill=(58, 56, 54, 255))
mask = Image.new('L', (pw, ph), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw - 1, ph - 1), radius=28, fill=255)
frame.paste(shot, (8, 8), mask)
img.paste(frame, (W - pw - 56, 80), frame)

img.save(f'{OUT}/feature-graphic.png')
print('Wrote', f'{OUT}/icon-512.png', 'and', f'{OUT}/feature-graphic.png')
