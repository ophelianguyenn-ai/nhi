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
import tempfile
import subprocess
from urllib import request

from mutagen.mp3 import MP3

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'audio-manifest.json'
FPT_ENDPOINT = 'https://mkp-api.fptcloud.com/v1/audio/speech'
FPT_MODEL = 'FPT.TTS-pro'
VOICE = {'vi': 'std_banmai', 'ko': 'ko-KR-InJoonNeural'}
PROVIDER = {'vi': 'fpt-marketplace', 'ko': 'microsoft-edge'}
VOICE_DIR = {'vi': 'fpt-marketplace-banmai-v1', 'ko': 'edge-injoon-v1'}


def collect(scope):
    if scope == 'daily':
        rows = json.loads((ROOT / 'scripts/daily-audio-texts.json').read_text(encoding='utf-8'))
        pairs = [(lang, str(row[i]).strip()) for row in rows
                 if isinstance(row, list) and len(row) >= 2
                 for i, lang in enumerate(('vi', 'ko'))]
    elif scope == 'auto':
        # Latest built-in lessons first: new study content receives both voices
        # before we spend quotas on replacing older legacy recordings.
        data = json.loads((ROOT / 'lessons.json').read_text(encoding='utf-8'))
        pairs = []
        for lesson in reversed(data.get('lessons', [])):
            for row in lesson.get('items', []):
                if isinstance(row, list) and len(row) >= 5:
                    pairs.extend((lang, str(row[index]).strip())
                                 for lang, index in (('vi', 3), ('ko', 4)))
        daily = ROOT / 'scripts/daily-audio-texts.json'
        if daily.exists():
            for row in json.loads(daily.read_text(encoding='utf-8')):
                if isinstance(row, list) and len(row) >= 2:
                    pairs.extend((lang, str(row[index]).strip())
                                 for lang, index in (('vi', 0), ('ko', 1)))
        # Legacy hand-authored cards are embedded in index.html. Read using
        # ROOT so unit tests and scheduled actions share the same sources.
        import re
        body = (ROOT / 'index.html').read_text(encoding='utf-8')
        for match in re.finditer(r"\['[wsaq]',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'", body):
            for lang, token in (('vi', match.group(1)), ('ko', match.group(2))):
                pairs.append((lang, token.replace("\\'", "'").strip()))
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
    """Call the CURRENT FPT Marketplace endpoint; returns binary WAV, not old async URL.

    Requires a Marketplace API key, distinct from the discontinued Console key.
    """
    api_key = ''.join(api_key.split())
    if not api_key or any(ord(ch) < 33 or ord(ch) == 127 for ch in api_key):
        raise ValueError('FPT_MARKETPLACE_API_KEY is missing or has invalid characters')
    payload = json.dumps({
        'model': FPT_MODEL,
        'voice': VOICE['vi'],
        'input': phrase,
        'response_format': 'wav',
    }, ensure_ascii=False).encode('utf-8')
    req = request.Request(FPT_ENDPOINT, data=payload, method='POST', headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    })
    with request.urlopen(req, timeout=90) as response:
        data = response.read()
    if len(data) < 44 or data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        raise RuntimeError('FPT Marketplace returned an invalid WAV response; audio not published')
    return data


def _fpt_bytes(phrase, api_key):
    # Marketplace requires >=3 characters. Preserve the manifest's original
    # text/key, but add punctuation to very short Vietnamese headwords for TTS.
    spoken = phrase if len(phrase) >= 3 else phrase + '.'
    if not 3 <= len(spoken) <= 5000:
        raise ValueError('FPT accepts only 3–5000 characters per request')
    return _post_fpt(spoken, api_key)


def _encode_mp3(wav_bytes, mp3_path):
    """Convert documented FPT Marketplace WAV output to the website's MP3 format."""
    if not wav_bytes.startswith(b'RIFF') or wav_bytes[8:12] != b'WAVE':
        raise ValueError('Invalid WAV input')
    with tempfile.NamedTemporaryFile(prefix='nhi-fpt-', suffix='.wav', dir=mp3_path.parent, delete=False) as raw:
        raw.write(wav_bytes)
        wav_path = pathlib.Path(raw.name)
    try:
        subprocess.run(
            ['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
             '-i', str(wav_path), '-codec:a', 'libmp3lame', '-q:a', '4', str(mp3_path)],
            check=True, capture_output=True, timeout=90)
    finally:
        wav_path.unlink(missing_ok=True)


async def _generate(lang, phrase, dest, api_key):
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.nhi-', suffix='.mp3', dir=dest.parent)
    os.close(fd)
    temp = pathlib.Path(name)
    try:
        if lang == 'vi':
            wav_bytes = await asyncio.to_thread(_fpt_bytes, phrase, api_key)
            await asyncio.to_thread(_encode_mp3, wav_bytes, temp)
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
    if args.scope == 'auto':
        # A phrase absent from the manifest cannot play its recorded voice at all:
        # prioritize it before legacy SunHi/HoaiMy clips, in newest-lesson order.
        new = [(lang, phrase) for lang, phrase in pending
               if f'{lang}|{phrase}' not in manifest]
        old = [(lang, phrase) for lang, phrase in pending
               if f'{lang}|{phrase}' in manifest]
        pending = new + old
        vi_limit = getattr(args, 'vi_limit', 100)
        ko_limit = getattr(args, 'ko_limit', 200)
        quotas = {'vi': vi_limit, 'ko': ko_limit}
        selected = {'vi': 0, 'ko': 0}
        batch = []
        for lang, phrase in pending:
            if quotas[lang] == 0 or selected[lang] < quotas[lang]:
                batch.append((lang, phrase))
                selected[lang] += 1
        print(f'Automated priorities: missing manifest={len(new)}, legacy/wrong voice={len(old)}; '
              f'daily target: Vietnamese={selected["vi"]}, Korean={selected["ko"]}', flush=True)
        pending = batch
    print(f'Scope: {args.scope}; selected: {len(entries)}; need voice replacement in this run: {len(pending)}', flush=True)
    print(f'Providers: Vietnamese FPT Marketplace TTS-pro Ban Mai; Korean Microsoft InJoon', flush=True)
    if args.dry_run:
        for lang, phrase in pending[:20]:
            print(f'  {lang} -> {VOICE[lang]}: {phrase[:100]}')
        return
    if any(lang == 'vi' for lang, _ in pending) and not os.environ.get('FPT_MARKETPLACE_API_KEY'):
        if args.scope == 'auto':
            print('::warning::FPT Marketplace secret is unavailable; skipping only Vietnamese. '
                  'Korean InJoon will still be generated.', flush=True)
            pending = [(lang, phrase) for lang, phrase in pending if lang != 'vi']
        else:
            raise SystemExit('FPT_MARKETPLACE_API_KEY is required (Marketplace, not the discontinued Console key). No audio changed.')
    failures = []
    updates = 0
    authentication_error = None
    for i, (lang, phrase) in enumerate(pending, 1):
        dest = target_path(lang, phrase)
        try:
            if dest.is_file() and dest.stat().st_size > 500:
                duration = round(MP3(str(dest)).info.length, 3)
            else:
                duration = await _generate(lang, phrase, dest, os.environ.get('FPT_MARKETPLACE_API_KEY', ''))
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
            # A revoked/expired/unauthorized key cannot recover on the next phrase.
            # Never loop through paid requests after Marketplace rejects credentials.
            if lang == 'vi' and getattr(exc, 'code', None) in (401, 403):
                authentication_error = int(exc.code)
                print('FPT Marketplace refused authentication. Stopping after the first rejected request; '
                      'check FPT_MARKETPLACE_API_KEY and access to FPT.TTS-pro.', flush=True)
                break
            if len(failures) >= args.max_failures:
                print('Too many failures; stopping to prevent repeated synthesis charges.', flush=True)
                break
    if updates:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Updated: {updates}; failures: {len(failures)}; total: {len(manifest)}', flush=True)
    if authentication_error is not None:
        detail = (f'FPT Marketplace HTTP {authentication_error}: check Marketplace key/model permissions. '
                  'Existing recordings are retained.')
        if args.scope == 'auto' and updates:
            print('::warning::' + detail + ' Valid Korean audio in this batch will still be saved.', flush=True)
        else:
            raise SystemExit(detail)
    if failures and (not args.allow_partial or updates == 0):
        raise SystemExit('Audio generation failed or created no new clips; '
                         'no unverified audio was written into the manifest.')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--scope', choices=('daily', 'all', 'auto'), default='daily')
    p.add_argument('--language', choices=('both', 'vi', 'ko'), default='both')
    p.add_argument('--offset', type=int, default=0)
    p.add_argument('--limit', type=int, default=30, help='Global selection size; use 0 with --scope auto.')
    p.add_argument('--vi-limit', type=int, default=100, help='Max new/missing Vietnamese clips per automatic run.')
    p.add_argument('--ko-limit', type=int, default=200, help='Max new/missing Korean clips per automatic run.')
    p.add_argument('--delay', type=float, default=0.35)
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--allow-partial', action='store_true')
    p.add_argument('--max-failures', type=int, default=3)
    cli = p.parse_args()
    if cli.offset < 0 or cli.limit < 0 or cli.vi_limit < 0 or cli.ko_limit < 0 or cli.delay < 0 or cli.max_failures < 1:
        p.error('Invalid negative argument or max-failures < 1')
    asyncio.run(run(cli))
