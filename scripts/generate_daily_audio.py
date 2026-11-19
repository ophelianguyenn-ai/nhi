"""Daily automatic coverage for new and legacy Korean/Vietnamese lesson MP3.

Run after lesson changes and each morning. No secrets are published to the site.
Keep each GitHub Actions job small to avoid FPT charges and stale manifests.
"""
import argparse
import asyncio
import os

from generate_selected_voices import run


async def main():
    def batch_limit(name, default):
        value = int(os.environ.get(name, str(default)))
        if value < 1 or value > 500:
            raise SystemExit(f'{name} must be from 1 to 500')
        return value

    args = argparse.Namespace(
        scope='auto', language='both', offset=0, limit=0,
        vi_limit=batch_limit('NHI_VI_DAILY_LIMIT', 100),
        ko_limit=batch_limit('NHI_KO_DAILY_LIMIT', 200),
        delay=0.35, dry_run=os.environ.get('NHI_AUDIO_DRY_RUN') == 'true',
        allow_partial=True, max_failures=3,
    )
    await run(args)


if __name__ == '__main__':
    asyncio.run(main())
