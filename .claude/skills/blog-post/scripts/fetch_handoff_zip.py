#!/usr/bin/env python3
"""Download a Handoff zip (follows redirects) and extract it.

Usage: fetch_handoff_zip.py <zip-url-or-local-path> <dest-dir>

Prints the extracted file list. Uses only the stdlib because `unzip` is not
installed on the VPS.
"""
import sys, os, zipfile, urllib.request, shutil

if len(sys.argv) != 3:
    sys.exit(__doc__)
src, dest = sys.argv[1], sys.argv[2]
os.makedirs(dest, exist_ok=True)
zip_path = os.path.join(dest, "post.zip")
if src.startswith("http://") or src.startswith("https://"):
    req = urllib.request.Request(src, headers={"User-Agent": "curl/8"})
    with urllib.request.urlopen(req) as r, open(zip_path, "wb") as f:
        shutil.copyfileobj(r, f)
else:
    shutil.copy(src, zip_path)
with zipfile.ZipFile(zip_path) as z:
    z.extractall(dest)
    for n in z.namelist():
        print(os.path.join(dest, n))
