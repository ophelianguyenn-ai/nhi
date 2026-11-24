"""Create a large, transparent pink flower icon without clipping its petals."""
from argparse import ArgumentParser
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops

def main():
    parser = ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    root = Path(__file__).resolve().parent.parent
    with Image.open(root / "nhi-flower-source.png") as source:
        flower = source.convert("RGB")
    # Remove only background connected to the outside, not the enclosed white stamens.
    red, green, blue = flower.split()
    outside = ImageChops.subtract(red, green).point(lambda x: 255 if x >= 25 else 0)
    ImageDraw.floodfill(outside, (0, 0), 128)
    alpha = outside.point(lambda x: 0 if x == 128 else 255)
    bounds = alpha.getbbox()
    assert bounds and alpha.getpixel((0, 0)) == 0
    assert alpha.getpixel((flower.width // 2, flower.height // 2)) == 255
    flower.putalpha(alpha)
    flower = flower.crop(bounds)
    for n in (32, 180, 192, 512):
        # Fill 96% of the square on the longest side; preserve the original ratio.
        inset = max(1, round(n * .02))
        factor = min((n - 2 * inset) / flower.width, (n - 2 * inset) / flower.height)
        scaled = flower.resize((round(flower.width * factor), round(flower.height * factor)),
                               Image.Resampling.LANCZOS)
        icon = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        icon.alpha_composite(scaled, ((n-scaled.width)//2, (n-scaled.height)//2))
        target = args.output / f"nhi-flower-v135-{n}.png"
        icon.save(target, optimize=True)
        with Image.open(target) as result:
            assert result.size == (n,n) and result.mode == "RGBA"
            box = result.getchannel("A").getbbox()
            assert box and box[0] >= 1 and box[1] >= 1 and box[2] <= n-1 and box[3] <= n-1
            assert result.getpixel((0,0))[3] == 0
            print(f"Built {target}; flower bounds {box}; transparent corners")
        for prefix in ("nhi-cover-icon", "nhi-mascot-closeup-v133", "nhi-flower-v134"):
            (args.output / f"{prefix}-{n}.png").write_bytes(target.read_bytes())

if __name__ == "__main__":
    main()
