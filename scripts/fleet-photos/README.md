# Fleet photographs

`public/cars/*.webp` are studio composites: a freely licensed Wikimedia Commons
photograph of each model, cut out and set on the hero film's cyclorama, so the
fleet reads as one shoot. `build.py` rebuilds all of them from `picks.json`.

## How the photos were chosen

- The exact model and generation in `database/seed.sql`, from the model's
  Commons category.
- **Front-left three-quarter**, the angle the 911 shows as it turns toward the
  camera in the film. One photo is mirrored (the Nexon EV) because the only
  usable Nexon EV photo faced the other way; its "EV" badge is too small to read
  at any display size.
- Neutral paint where a usable photo existed. The Thar and the Virtus GT are red
  because no neutral photo of those exact models was usable.
- Licences: CC BY or CC BY-SA only, so edits are allowed and attribution is
  straightforward. Author, licence and source are in `public/cars/credits.json`,
  shown under each photo on its detail page and in full on `/credits`.

## Processing

1. Cutout with BiRefNet lite (`rembg`), on the CPU.
2. Readable number plates blurred (the boxes in `picks.json`, as fractions of
   the photo).
3. Scaled to the same width (80% of the frame, or 64% of the height for tall
   cars) on the same ground line.
4. A gentle per-car levels stretch, so photos shot in haze match the rest.
5. A contact shadow traced from the car's own bottom edge, plus a soft pool.
6. Relit to the page grey (`relight()`): every pixel is multiplied by page
   grey over the backdrop's own colour there, so the backdrop becomes exactly
   `#BDBCBA` (the site's `--color-ground`), the shadow keeps its depth, and
   the car takes the same light. A car stands on the page with no box.
7. 1600x1067 WebP at quality 82, about 60 KB each.

If the page grey changes, set `PAGE` in `build.py` to match. To relight the
finished photos without rebuilding them (numpy and pillow only, no cutout
model), run `python scripts/fleet-photos/build.py --relight-only`. It skips a
photo whose backdrop is already the page grey, so running it twice is safe;
to relight to a new grey, restore the photos from git first.

## Rebuilding

```bash
python -m venv .venv
.venv/Scripts/pip install "rembg[cpu]" scipy pillow numpy   # macOS, Linux: .venv/bin/pip
python scripts/fleet-photos/build.py
```

Downloads and the model (about 220 MB) go to `.cache/fleet-photos/`, which is
gitignored. To add a car: append it to `picks.json` (with the plate box if its
plate is readable), rebuild, and set its `image_url` to `/cars/<slug>.webp`.
