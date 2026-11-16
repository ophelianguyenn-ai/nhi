#!/usr/bin/env python3
"""Safely migrate lesson MP3: Vietnamese FPT Ban Mai, Korean Edge InJoon.

The website reads static audio-manifest.json: it never needs an API key.
Generate in small, explicit batches. Original MP3 files remain available until
replacement MP3 files are verified and individually entered into the manifest.
"""
import argparse
import asyncio
import hashlib
import json
import os
import pathlib
import re
import tempfile
import time
from urllib import error, parse, request

from mutagen.mp3 import MP3

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'audio-manifest.json'
FPT_ENDPOINT = 'https://api.fpt.ai/hmi/tts/v5'
VOICE = {'vi': 'banmai', 'ko': 'ko-KR-InJoonNeural'}
PROVIDER = {'vi': 'fpt', 'ko': 'microsoft-edge'}
VOICE_DIR = {'vi': 'fpt-banmai-v1', 'ko': 'edge-injoon-v1'}


def collect(scope):
    if scope == 'daily':
        rows = json.loads((ROOT / 'scripts/daily-audio-texts.json').read_text(encoding='utf-8'))
        pairs = [(lang, str(row[i]).strip()) for row in rows
                 if isinstance(row, list) and len(row) >= 2
                 for i, lang in enumerate(('vi', 'ko'))]
    else:
        from generate_tts import collect as original_collect
        pairs = list(original_collect())
    seen = set()
    for lang, text in pairs:
        if not text or '\n' in text or (lang, text) in seen:
            continue
        seen.add((lang, text))
        yield lang, text


def target_path(lang, phrase):
    # Voice/version is part of the location so original MP3s are never overwritten.
    slug = VOICE_DIR[lang]
    digest = hashlib.sha256(f'{lang}|{VOICE[lang]}|v1|{phrase}'.encode('utf-8')).hexdigest()[:24]
    return ROOT / 'audio' / lang / slug / (digest + '.mp3')


def current_entry(entry, lang):
    return isinstance(entry, dict) and entry.get('voice') == VOICE[lang] and entry.get('provider') == PROVIDER[lang]


def _post_fpt(phrase, api_key):
    payload = phrase.encode('utf-8')
    req = request.Request(FPT_ENDPOINT, data=payload, method='POST', headers={
        'api_key': api_key, 'voice': VOICE['vi'], 'speed': '0',
        'format': 'mp3', 'Cache-Control': 'no-cache'})
    with request.urlopen(req, timeout=35) as response:
        result = json.loads(response.read().decode('utf-8'))
    if str(result.get('error', '0')) not in ('0', '') or result.get('success') is False or result.get('success') == 'false':
        raise RuntimeError(f'FPT rejected synthesis: {result.get("message", "unknown error")}')
    url = result.get('async') or result.get('message')
    if not isinstance(url, str) or parse.urlparse(url).scheme != 'https':
        raise RuntimeError('FPT response did not contain a usable HTTPS audio URL')
    return url


def _download_fpt(url, timeout_seconds=165):
    """FPT returns an asynchronous URL; it may need up to two minutes to exist."""
    deadline = time.monotonic() + timeout_seconds
    last = None
    while time.monotonic() < deadline:
        try:
            req = request.Request(url, headers={'User-Agent': 'NHI-Learning-Corner-Audio/1.0'})
            with request.urlopen(req, timeout=30) as response:
                content = response.read()
            if len(content) < 500:
                raise ValueError('Audio file is not ready or is too short')
            return content
        except (error.HTTPError, error.URLError, TimeoutError, ValueError) as exc:
            last = exc
            time.sleep(min(5, max(0.1, deadline-time.monotonic())))
    raise RuntimeError(f'FPT async MP3 did not become available: {last}')


def _fpt_bytes(phrase, api_key):
    if not 3 <= len(phrase) <= 5000:
        raise ValueError('FPT accepts only 3–5000 characters per request')
    return _download_fpt(_post_fpt(phrase, api_key))


async def _generate(lang, phrase, dest, api_key):
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.nhi-', suffix='.mp3', dir=dest.parent)
    os.close(fd)
    temp = pathlib.Path(name)
    try:
        if lang == 'vi':
            content = await asyncio.to_thread(_fpt_bytes, phrase, api_key)
            temp.write_bytes(content)
        else:
            import edge_tts
            await edge_tts.Communicate(phrase, VOICE[lang]).save(str(temp))
        duration = round(MP3(str(temp)).info.length, 3)
        if duration <= 0 or temp.stat().st_size <= 500:
            raise ValueError('Audio is empty or not a valid MP3')
        temp.replace(dest)
        return duration
    finally:
        if temp.exists():
            temp.unlink()


async def run(args):
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    entries = [(l, t) for l, t in collect(args.scope) if args.language == 'both' or l == args.language]
    entries = entries[args.offset:args.offset+args.limit] if args.limit else entries[args.offset:]
    pending = [(lang, phrase) for lang, phrase in entries
               if not (current_entry(manifest.get(f'{lang}|{phrase}'), lang)
                       and (ROOT / manifest[f'{lang}|{phrase}']['src']).is_file())]
    print(f'Scope: {args.scope}; selected: {len(entries)}; need voice replacement: {len(pending)}', flush=True)
    print(f'Providers: Vietnamese FPT Ban Mai; Korean Microsoft InJoon', flush=True)
    if args.dry_run:
        for lang, phrase in pending[:20]:
            print(f'  {lang} -> {VOICE[lang]}: {phrase[:100]}')
        return
    if any(lang == 'vi' for lang, _ in pending) and not os.environ.get('FPT_API_KEY'):
        raise SystemExit('FPT_API_KEY is required to generate Ban Mai. Add it as a GitHub Actions secret; no audio changed.')
    failures = []
    updates = 0
    for i, (lang, phrase) in enumerate(pending, 1):
        dest = target_path(lang, phrase)
        try:
            if dest.is_file() and dest.stat().st_size > 500:
                duration = round(MP3(str(dest)).info.length, 3)
            else:
                duration = await _generate(lang, phrase, dest, os.environ.get('FPT_API_KEY', ''))
            manifest[f'{lang}|{phrase}'] = {'src': dest.relative_to(ROOT).as_posix(),
                                          'start': 0, 'end': duration,
                                          'provider': PROVIDER[lang], 'voice': VOICE[lang]}
            updates += 1
            print(f'OK {i}/{len(pending)} {lang}: {phrase[:70]}', flush=True)
            if args.delay:
                await asyncio.sleep(args.delay)
        except Exception as exc:
            failures.append((lang, phrase, str(exc)))
            print(f'FAILED {i}: {lang}: {phrase[:70]}: {exc}', flush=True)
            if len(failures) >= args.max_failures:
                print('Too many failures; stopping to prevent repeated synthesis charges.', flush=True)
                break
    if updates:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Updated: {updates}; failures: {len(failures)}; total: {len(manifest)}', flush=True)
    if failures and not args.allow_partial:
        raise SystemExit('Some voice replacements failed; no bad entries were written to the manifest.')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--scope', choices=('daily', 'all'), default='daily')
    p.add_argument('--language', choices=('both', 'vi', 'ko'), default='both')
    p.add_argument('--offset', type=int, default=0)
    p.add_argument('--limit', type=int, default=30, help='Batch size; 0 selects all. Default 30.')
    p.add_argument('--delay', type=float, default=0.35)
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--allow-partial', action='store_true')
    p.add_argument('--max-failures', type=int, default=3)
    cli = p.parse_args()
    if cli.offset < 0 or cli.limit < 0 or cli.delay < 0 or cli.max_failures < 1:
        p.error('Invalid negative argument or max-failures < 1')
    asyncio.run(run(cli))
