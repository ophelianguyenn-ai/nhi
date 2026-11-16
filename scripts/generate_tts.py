#!/usr/bin/env python3
"""Compatibility entrypoint for full-deck audio generation.

Old SunHi/HoaiMy MP3s remain as fallback, but all newly-generated files use
Korean InJoon or Vietnamese FPT Ban Mai. No website API key is ever exposed.
"""
import argparse
import asyncio
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]


def collect():
    """Collect all legacy deck phrases in stable order for paginated batches."""
    data = json.loads((ROOT / 'lessons.json').read_text(encoding='utf-8'))
    seen = set()
    for lesson in data.get('lessons', []):
        for row in lesson.get('items', []):
            if not isinstance(row, list) or len(row) < 5:
                continue
            for lang, value in (('vi', row[3]), ('ko', row[4])):
                phrase = str(value).strip()
                if phrase and (lang, phrase) not in seen:
                    seen.add((lang, phrase))
                    yield lang, phrase
    # Older hand-authored cards live in the root index.html.
    body = (ROOT / 'index.html').read_text(encoding='utf-8')
    for match in re.finditer(r"\['[wsaq]',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'", body):
        for lang, token in (('vi', match.group(1)), ('ko', match.group(2))):
            phrase = token.replace("\\'", "'").strip()
            if phrase and (lang, phrase) not in seen:
                seen.add((lang, phrase))
                yield lang, phrase


async def main(args):
    from generate_selected_voices import run
    mapped = argparse.Namespace(scope='all', language=args.lang, offset=args.offset,
                                limit=args.limit, delay=args.delay,
                                dry_run=args.dry_run,
                                allow_partial=args.allow_partial, max_failures=3)
    await run(mapped)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--lang', choices=('both', 'ko', 'vi'), default='both')
    p.add_argument('--offset', type=int, default=0)
    p.add_argument('--limit', type=int, default=30,
                   help='Only 30 phrases by default; 0 = all, which may consume substantial FPT quota')
    p.add_argument('--delay', type=float, default=0.35)
    p.add_argument('--allow-partial', action='store_true')
    p.add_argument('--dry-run', action='store_true')
    asyncio.run(main(p.parse_args()))
