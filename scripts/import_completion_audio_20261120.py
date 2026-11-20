#!/usr/bin/env python3
"""Import the exact user-supplied Pixabay celebration sound into static Pages.

The source is the public original for sound effect 128937 ("lang zal die leven"
by jolandabayens). Verify SHA-256 against the user's supplied MP3 before use.
No API tokens, unrelated files, or external sound substitution are allowed.
"""
from __future__ import annotations
import hashlib
import html
import pathlib
import re
import urllib.request
from urllib.parse import urlparse
import subprocess

ROOT=pathlib.Path(__file__).resolve().parents[1]
DEST=ROOT/"nhi-celebration-jolandabayens-20261120.mp3"
EXPECTED="f0d849d6c4b4c5a3d6bb6bdaec8a84fb90b412a7d7d45c91befb501594e93ef4"
PAGE="https://pixabay.com/sound-effects/people-lang-zal-die-leven-128937/"
CANDIDATES=["https://cdn.pixabay.com/audio/2024/06/12/audio_2a8c3df796.mp3"]

def fetch(url: str) -> bytes:
    if urlparse(url).hostname not in {"cdn.pixabay.com","pixabay.com"}:
        raise ValueError("Unsupported audio source domain")
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; NhiAudioImporter/1.0)","Referer":"https://pixabay.com/"})
    with urllib.request.urlopen(req,timeout=30) as response:
        return response.read()

def find_audio_urls(page: bytes):
    doc=html.unescape(page.decode("utf8","replace").replace("\\/","/"))
    # Pixabay includes download URLs as either direct /audio/ or /download/audio/.
    found=re.findall(r"https?://cdn\\.pixabay\\.com/(?:download/)?audio/[^\"'<>\\s]+",doc)
    return [u.rstrip(".,);") for u in found if (".mp3" in u or "filename=" in u)]

def main():
    if DEST.exists():
        if hashlib.sha256(DEST.read_bytes()).hexdigest()==EXPECTED:
            print("Original uploaded MP3 already present, unchanged")
            return
        raise SystemExit("Refusing to overwrite a differing completion MP3")
    urls=list(CANDIDATES)
    try:
        urls+=find_audio_urls(fetch(PAGE))
    except Exception as ex:
        print("Public source page unavailable:",type(ex).__name__,str(ex)[:120])
    seen=set()
    for url in urls:
        if url in seen: continue
        seen.add(url)
        try:
            data=fetch(url)
            sha=hashlib.sha256(data).hexdigest()
            print("Source candidate:",url[:140],"bytes:",len(data),"sha256:",sha)
            if sha!=EXPECTED:
                print("Skipping candidate: not identical to user's uploaded recording")
                continue
            DEST.write_bytes(data)
            subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1",str(DEST)],check=True)
            print("Imported EXACT uploaded celebration MP3:",DEST.name)
            return
        except Exception as ex:
            print("Source failed:",type(ex).__name__,str(ex)[:160])
    raise SystemExit("Could not fetch an exact SHA-256 match for the user's uploaded MP3. No file changed.")

if __name__=="__main__":main()
