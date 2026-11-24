"""Build app icons from the exact existing Nhi cover assets."""
from argparse import ArgumentParser
from pathlib import Path
from PIL import Image

def main():
    parser = ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    root = Path(__file__).resolve().parent.parent
    size = 1024
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    with Image.open(root / "nhi-mascot.webp") as source:
        girl = source.convert("RGBA")
    bbox = girl.getchannel("A").getbbox()
    if bbox:
        girl = girl.crop(bbox)
    # Frame the head and upper body more tightly for a readable home icon.
    # Keep the top of the hair and both sides of the original artwork.
    crop_h = min(girl.height, max(girl.width, round(girl.height * .72)))
    girl = girl.crop((0, 0, girl.width, crop_h))
    factor = min((size * .98) / girl.width, (size * .98) / girl.height)
    girl = girl.resize((round(girl.width * factor), round(girl.height * factor)),
                       Image.Resampling.LANCZOS)
    icon.alpha_composite(girl, ((size - girl.width) // 2,
                               (size - girl.height) // 2))
    for n in (32, 180, 192, 512):
        target = args.output / f"nhi-cover-icon-{n}.png"
        icon.resize((n, n), Image.Resampling.LANCZOS).save(target, optimize=True)
        with Image.open(target) as result:
            assert result.size == (n, n) and result.mode == "RGBA"
            assert result.getchannel("A").getextrema()[0] == 0
        # A different filename prevents stale installed icons being reused.
        versioned = args.output / f"nhi-mascot-closeup-v133-{n}.png"
        target.replace(versioned)
        # Keep the previous URL available to old offline installations.
        target.write_bytes(versioned.read_bytes())
        print(f"Built {versioned}")

if __name__ == "__main__":
    main()
