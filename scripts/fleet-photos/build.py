"""
Fleet photography pipeline.

Downloads each photograph listed in picks.json from Wikimedia Commons, cuts
the car out of its background, blurs a readable number plate, and sets the car
on the hero film's cyclorama with a contact shadow, so the whole fleet reads
as one studio shoot. Writes public/cars/<slug>.webp and
public/cars/credits.json.

    python -m venv .venv
    .venv/Scripts/pip install "rembg[cpu]" scipy pillow numpy      (Windows)
    .venv/bin/pip install "rembg[cpu]" scipy pillow numpy          (macOS, Linux)
    python scripts/fleet-photos/build.py [--work .cache/fleet-photos]

The cutout model (BiRefNet lite, about 220 MB) downloads on first run into the
work folder. Every source is CC BY or CC BY-SA; credits.json records author,
licence and source, which the site shows under each photo and on /credits.
"""

import argparse
import json
import os
import urllib.request

import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PICKS = os.path.join(os.path.dirname(__file__), 'picks.json')
OUT = os.path.join(ROOT, 'public', 'cars')
UA = 'D4DriveAssetScript/1.0 (https://github.com/vrrroro/D4Drive)'

W, H = 2400, 1600            # master canvas; written out at 1600x1067
CAR_W, MAX_CAR_H = 0.80, 0.64  # car width, and a height cap for tall cars
GROUND = 0.84                  # where every car's lowest point sits


def download(url, path):
    if os.path.exists(path):
        return
    # Python's own certificate store can be stale on Windows; certifi (which
    # rembg's dependencies install) carries a current one.
    try:
        import certifi
        import ssl

        context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        context = None
    request = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(request, context=context) as response, open(path, 'wb') as f:
        f.write(response.read())


def backdrop():
    """The film's cyclorama, lifted toward the site's alabaster ground."""
    y = np.linspace(0, 1, H)[:, None]
    top, mid, floor = np.array([196, 195, 193]), np.array([216, 215, 213]), np.array([232, 231, 229])
    t1 = np.clip(y / 0.6, 0, 1)
    t2 = np.clip((y - 0.6) / 0.4, 0, 1)
    col = np.where(y < 0.6, top + (mid - top) * t1, mid + (floor - mid) * t2)
    img = np.broadcast_to(col[:, None, :], (H, W, 3)).astype(np.float32).copy()
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    key = np.sqrt(((xx - W * 0.5) / (W * 0.55)) ** 2 + ((yy - H * 0.48) / (H * 0.6)) ** 2)
    img += (np.clip(1 - key, 0, 1) ** 1.6 * 14)[..., None]
    vignette = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    img -= (np.clip(vignette - 0.75, 0, 1) * 18)[..., None]
    img += np.random.default_rng(7).normal(0, 1.4, img.shape).astype(np.float32)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')


def place(cut):
    """Same width, same ground line, centred."""
    alpha = np.asarray(cut)[..., 3]
    ys, xs = np.where(alpha > 128)
    car = cut.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    scale = min(W * CAR_W / car.width, H * MAX_CAR_H / car.height)
    car = car.resize((round(car.width * scale), round(car.height * scale)), Image.LANCZOS)
    return car, round((W - car.width) / 2), round(H * GROUND - car.height)


def levels(car, strength=0.55):
    """Percentile stretch over the car's own pixels: hazy photos come up."""
    arr = np.asarray(car, np.float32)
    rgb, alpha = arr[..., :3], arr[..., 3]
    solid = alpha > 200
    if solid.sum() < 100:
        return car
    lum = rgb[solid].mean(axis=1)
    lo, hi = np.percentile(lum, 1.0), np.percentile(lum, 99.3)
    if hi - lo < 10:
        return car
    stretched = np.clip((rgb - lo) * (242.0 / (hi - lo)) + 6, 0, 255)
    out = rgb + (stretched - rgb) * strength
    return Image.fromarray(np.dstack([np.clip(out, 0, 255), alpha]).astype(np.uint8), 'RGBA')


def shadows(car, left, top):
    """A contact shadow under the car's own bottom edge, plus a soft pool."""
    from scipy.ndimage import gaussian_filter

    cw, ch = car.size
    solid = np.asarray(car.split()[3], np.float32) / 255.0 > 0.5
    has = solid.any(axis=0)
    bottom = np.where(has, ch - 1 - np.argmax(solid[::-1, :], axis=0), -1).astype(np.float32)
    cols = np.where(has)[0]
    contact = np.zeros((H, W), np.float32)
    for x in cols:
        gx = left + x
        if 0 <= gx < W:
            b = int(top + bottom[x])
            # Only below the car's bottom edge: the floor, never the bodywork.
            contact[max(0, b - 2):min(H, b + int(ch * 0.016)), gx] = 1.0
    contact = gaussian_filter(contact, sigma=(ch * 0.010, cw * 0.004))
    ground = top + float(np.median(bottom[cols]))
    x0, x1 = left + cols.min(), left + cols.max()
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    pool = np.clip(1 - ((xx - (x0 + x1) / 2) / ((x1 - x0) * 0.52)) ** 2 - ((yy - (ground + ch * 0.012)) / (ch * 0.075)) ** 2, 0, 1)
    pool = gaussian_filter(pool, sigma=(ch * 0.03, cw * 0.03))
    shade = np.zeros((H, W, 4), np.uint8)
    shade[..., 0:3] = (44, 42, 40)
    shade[..., 3] = np.clip(contact * 255 * 0.72 + pool * 255 * 0.34, 0, 255).astype(np.uint8)
    return Image.fromarray(shade, 'RGBA')


def blur_plate(cut, box):
    x0, y0, x1, y1 = box
    rect = (int(x0 * cut.width), int(y0 * cut.height), int(x1 * cut.width), int(y1 * cut.height))
    region = cut.crop(rect)
    rgb = region.convert('RGB').filter(ImageFilter.GaussianBlur(max(6, region.width // 9)))
    cut.paste(Image.merge('RGBA', (*rgb.split(), region.split()[3])), rect)
    return cut


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--work', default=os.path.join(ROOT, '.cache', 'fleet-photos'))
    args = parser.parse_args()
    os.makedirs(args.work, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    os.environ.setdefault('U2NET_HOME', os.path.join(args.work, 'models'))

    from rembg import new_session, remove

    session = new_session('birefnet-general-lite')
    picks = json.load(open(PICKS, encoding='utf-8'))
    credits = []
    for pick in picks:
        source = os.path.join(args.work, pick['slug'] + os.path.splitext(pick['url'])[1].lower())
        download(pick['url'], source)
        image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
        if pick['mirror']:
            image = ImageOps.mirror(image)
        scale = min(1.0, 2400 / max(image.size))
        if scale < 1:
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)

        cut = remove(image, session=session, post_process_mask=True).convert('RGBA')
        if pick['plate']:
            cut = blur_plate(cut, pick['plate'])

        car, left, top = place(cut)
        car = levels(car)
        frame = backdrop()
        frame.alpha_composite(shadows(car, left, top))
        frame.alpha_composite(car, (left, top))
        target = os.path.join(OUT, pick['slug'] + '.webp')
        frame.convert('RGB').resize((1600, 1067), Image.LANCZOS).save(target, 'WEBP', quality=82, method=6)
        print(pick['slug'], os.path.getsize(target) // 1024, 'KB', flush=True)

        credits.append({
            'image': '/cars/' + pick['slug'] + '.webp',
            'model': pick['model'],
            'title': pick['title'],
            'author': pick['author'],
            'license': pick['license'],
            'source': pick['source'],
            'mirrored': pick['mirror'],
            'plateBlurred': pick['plate'] is not None,
        })

    with open(os.path.join(OUT, 'credits.json'), 'w', encoding='utf-8') as f:
        json.dump(credits, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
