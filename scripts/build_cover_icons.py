"""Build app icons from the exact existing Nhi cover assets."""
from argparse import ArgumentParser
from pathlib import Path
from PIL import Image, ImageOps

def main():
    parser = ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    root = Path(__file__).resolve().parent.parent
    size = 1024
    with Image.open(root / "garden-day.webp") as source:
        icon = ImageOps.fit(source.convert("RGBA"), (size, size),
                            method=Image.Resampling.LANCZOS)
    with Image.open(root / "nhi-mascot.webp") as source:
        girl = source.convert("RGBA")
    bbox = girl.getchannel("A").getbbox()
    if bbox:
        girl = girl.crop(bbox)
    girl.thumbnail((int(size * .84), int(size * .80)), Image.Resampling.LANCZOS)
    icon.alpha_composite(girl, ((size - girl.width) // 2,
                               (size - girl.height) // 2 + int(size * .025)))
    for n in (32, 180, 192, 512):
        target = args.output / f"nhi-cover-icon-{n}.png"
        icon.convert("RGB").resize((n, n), Image.Resampling.LANCZOS).save(target, optimize=True)
        with Image.open(target) as result:
            assert result.size == (n, n)
        print(f"Built {target}")

if __name__ == "__main__":
    main()
