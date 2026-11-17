"""Add selected-voice clips for the daily lesson (FPT Marketplace Ban Mai, Edge InJoon).

Without a protected FPT_MARKETPLACE_API_KEY, only Korean InJoon may be produced; the
existing Vietnamese recordings remain playable until a key is configured.
"""
import argparse
import asyncio
import os

from generate_selected_voices import run


async def main():
    has_fpt = bool(os.environ.get('FPT_MARKETPLACE_API_KEY'))
    if not has_fpt:
        print('FPT_MARKETPLACE_API_KEY is not configured: preserving existing Vietnamese audio; generating InJoon only.', flush=True)
    args = argparse.Namespace(scope='daily', language='both' if has_fpt else 'ko',
                              offset=0, limit=10, delay=0.35, dry_run=False,
                              allow_partial=True, max_failures=3)
    await run(args)


if __name__ == '__main__':
    asyncio.run(main())
