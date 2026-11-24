"""Build website icons from the supplied pink flower image."""
from argparse import ArgumentParser
from pathlib import Path
from PIL import Image

def main():
    parser = ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    root = Path(__file__).resolve().parent.parent
    with Image.open(root / "nhi-flower-source.png") as source:
        icon = source.convert("RGB")
    for n in (32, 180, 192, 512):
        target = args.output / f"nhi-flower-v134-{n}.png"
        icon.resize((n,n), Image.Resampling.LANCZOS).save(target, optimize=True)
        with Image.open(target) as result:
            assert result.size == (n,n) and result.mode == "RGB"
        for prefix in ("nhi-cover-icon", "nhi-mascot-closeup-v133"):
            (args.output / f"{prefix}-{n}.png").write_bytes(target.read_bytes())
        print(f"Built {target}")

if __name__ == "__main__":
    main()
