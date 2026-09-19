#!/usr/bin/env python3
"""Скачивает woff2-файлы IBM Plex с Google Fonts (лицензия OFL) в assets/fonts/.

Результат: assets/fonts/*.woff2 и assets/fonts/fonts.json с описанием
каждого файла (семейство, начертание, unicode-range). Сборка (tools/build.py)
встраивает их в index.html как data: URI.
"""
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "fonts")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
CSS_URL = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600"
           "&family=IBM+Plex+Serif:wght@500&display=swap")
KEEP_SUBSETS = {"cyrillic", "cyrillic-ext", "greek", "latin", "latin-ext"}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    os.makedirs(OUT, exist_ok=True)
    css = get(CSS_URL).decode("utf-8")
    blocks = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S)
    faces = []
    for subset, body in blocks:
        if subset not in KEEP_SUBSETS:
            continue
        fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
        weight = re.search(r"font-weight:\s*(\d+)", body).group(1)
        style = re.search(r"font-style:\s*(\w+)", body).group(1)
        url = re.search(r"url\(([^)]+)\)", body).group(1)
        urange = re.search(r"unicode-range:\s*([^;]+);", body).group(1).strip()
        slug = fam.lower().replace(" ", "-")
        fname = f"{slug}-{weight}-{style}-{subset}.woff2"
        path = os.path.join(OUT, fname)
        if not os.path.exists(path):
            data = get(url)
            with open(path, "wb") as f:
                f.write(data)
        faces.append({"family": fam, "weight": int(weight), "style": style,
                      "subset": subset, "unicodeRange": urange, "file": fname,
                      "license": "SIL Open Font License 1.1",
                      "licenseUrl": "https://openfontlicense.org/",
                      "source": "https://fonts.google.com/specimen/IBM+Plex+Sans"})
    with open(os.path.join(OUT, "fonts.json"), "w", encoding="utf-8") as f:
        json.dump(faces, f, ensure_ascii=False, indent=2)
    total = sum(os.path.getsize(os.path.join(OUT, x["file"])) for x in faces)
    print(f"{len(faces)} файлов, {total/1024:.0f} КБ")


if __name__ == "__main__":
    sys.exit(main())
