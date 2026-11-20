#!/usr/bin/env python3
"""Extract the nine real GIF frames; remove ONLY contiguous near-white backdrop.

This retains the original drawings and poses, not a reconstructed or re-rigged
animation. The original GIF is committed unchanged as luong-nhi-goc.gif.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path
import argparse
import json
import hashlib

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "luong-nhi-goc.gif"
EXPECTED_SIZE = (476, 358)
EXPECTED_COUNT = 9
EXPECTED_DURATION_MS = 130


def remove_exterior_backdrop(frame: Image.Image) -> Image.Image:
    image = frame.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def is_backdrop(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        # The original GIF's off-white background varies slightly by pixel.
        # Only pale neutral pixels connected to the image's exterior are removed.
        return min(r, g, b) >= 224 and max(r, g, b) - min(r, g, b) <= 17

    def seed(x: int, y: int) -> None:
        offset = y * width + x
        if not visited[offset] and is_backdrop(x, y):
            visited[offset] = 1
            queue.append((x, y))

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(height):
        seed(0, y)
        seed(width - 1, y)

    while queue:
        x, y = queue.popleft()
        alpha_pixels[x, y] = 0
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                seed(nx, ny)

    image.putalpha(alpha)
    return image


def build(output: Path) -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Original animation is missing: {SOURCE}")
    expected_sha = "f25a96ec8fe753c29d60fa5abb5a33b1d924641bb98f962496803faa2cf270c9"
    actual_sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if actual_sha != expected_sha:
        raise SystemExit(f"Original GIF does not match user's upload: {actual_sha}")
    gif = Image.open(SOURCE)
    if gif.size != EXPECTED_SIZE or gif.n_frames != EXPECTED_COUNT:
        raise SystemExit(f"GIF must contain exactly {EXPECTED_COUNT} frames of {EXPECTED_SIZE}; got {gif.n_frames} at {gif.size}")
    output.mkdir(parents=True, exist_ok=True)
    durations = []
    for i in range(EXPECTED_COUNT):
        gif.seek(i)
        ms = gif.info.get("duration")
        if ms != EXPECTED_DURATION_MS:
            raise SystemExit(f"Frame {i} duration {ms}ms, expected {EXPECTED_DURATION_MS}ms")
        durations.append(ms)
        image = remove_exterior_backdrop(gif.convert("RGBA"))
        frame_name = f"frame-{i:02d}.webp"
        image.save(output / frame_name, format="WEBP", lossless=True, method=5)
        if not (output / frame_name).stat().st_size:
            raise SystemExit(f"Empty extracted frame: {frame_name}")
    (output / "manifest.json").write_text(json.dumps({
        "source": "luong-nhi-goc.gif",
        "sourceSize": list(EXPECTED_SIZE),
        "frameCount": EXPECTED_COUNT,
        "frameDurationsMs": durations,
        "loop": False,
        "holdLastFrame": True,
        "backgroundTreatment": "remove only pale neutral exterior connected to border"
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Exact original GIF poses extracted: {EXPECTED_COUNT} frames x {EXPECTED_DURATION_MS}ms -> {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "assets" / "cover-gif")
    build(parser.parse_args().output)
