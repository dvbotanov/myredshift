#!/usr/bin/env python3
"""Скачивает изображения из Wikimedia Commons по списку tools/wanted_assets.json,
проверяет лицензию через API, готовит уменьшенные версии через sips (macOS)
и пишет манифест src/data/assets.json.

  python3 tools/fetch_assets.py            # скачать недостающее и пересобрать манифест
  python3 tools/fetch_assets.py --force    # перекачать всё

Оригиналы лежат в assets/source/ (не в git), готовые — в assets/img/ и assets/thumb/.
"""
import json
import os
import subprocess
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commons  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source")
IMG = os.path.join(ROOT, "assets", "img")
THUMB = os.path.join(ROOT, "assets", "thumb")
MANIFEST = os.path.join(ROOT, "src", "data", "assets.json")
HERO_W = 1200      # герои сцен
SECONDARY_W = 640  # вторичные изображения
THUMB_PX = 240
JPEG_Q = 40
JPEG_Q_SEC = 45


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": commons.UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as f:
        f.write(r.read())


def sips(*args):
    subprocess.run(["sips", *args], check=True, capture_output=True)


def dims(path):
    out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", path],
                         check=True, capture_output=True, text=True).stdout
    w = int(out.split("pixelWidth:")[1].split()[0])
    h = int(out.split("pixelHeight:")[1].split()[0])
    return w, h


def make_hero(src, dst, width=HERO_W, q=JPEG_Q):
    sips("-s", "format", "jpeg", "-s", "formatOptions", str(q),
         "--resampleWidth", str(width), src, "--out", dst)


def make_thumb(src, dst, focal, crop):
    """Квадратная миниатюра вокруг фокусной точки. crop=[cx, cy, size] в долях ширины."""
    w, h = dims(src)
    if crop:
        cx, cy, frac = crop
        side = int(min(w, h) * frac) if frac <= 1 else int(frac)
    else:
        cx, cy = focal
        side = min(w, h)
    side = max(32, min(side, w, h))
    x = int(max(0, min(w - side, cx * w - side / 2)))
    y = int(max(0, min(h - side, cy * h - side / 2)))
    tmp = dst + ".tmp.jpg"
    sips("-s", "format", "jpeg", "-s", "formatOptions", "85",
         "--cropOffset", str(y), str(x), "-c", str(side), str(side), src, "--out", tmp)
    sips("-s", "format", "jpeg", "-s", "formatOptions", "78",
         "--resampleWidth", str(THUMB_PX), tmp, "--out", dst)
    os.remove(tmp)


def main():
    force = "--force" in sys.argv
    for d in (SRC, IMG, THUMB):
        os.makedirs(d, exist_ok=True)
    wanted = json.load(open(os.path.join(ROOT, "tools", "wanted_assets.json"), encoding="utf-8"))
    scenes = json.load(open(os.path.join(ROOT, "src", "data", "scenes.json"), encoding="utf-8"))
    hero_ids = {s["heroAssetId"] for s in scenes}
    manifest = []
    problems = []
    for w in wanted:
        aid = w["id"]
        info = commons.info(w["commons"], width=HERO_W + 200)
        if not info:
            problems.append(f"{aid}: файл не найден на Commons ({w['commons']})")
            continue
        src_path = os.path.join(SRC, aid + ".jpg")
        if force or not os.path.exists(src_path):
            url = info["thumbUrl"] or info["originalUrl"]
            if info["mime"] in ("image/png", "image/gif") and info["width"] <= HERO_W + 200:
                url = info["originalUrl"]
                src_path = os.path.join(SRC, aid + os.path.splitext(url)[1].lower())
            try:
                download(url, src_path)
            except Exception as e:  # noqa: BLE001
                problems.append(f"{aid}: ошибка загрузки {e}")
                continue
        else:
            for ext in (".jpg", ".png", ".gif"):
                if os.path.exists(os.path.join(SRC, aid + ext)):
                    src_path = os.path.join(SRC, aid + ext)
        hero = os.path.join(IMG, aid + ".jpg")
        thumb = os.path.join(THUMB, aid + ".jpg")
        try:
            if force or not os.path.exists(hero):
                if aid in hero_ids:
                    make_hero(src_path, hero)
                else:
                    make_hero(src_path, hero, SECONDARY_W, JPEG_Q_SEC)
            if force or not os.path.exists(thumb):
                make_thumb(src_path, thumb, w["focal"], w.get("thumbCrop"))
        except subprocess.CalledProcessError as e:
            problems.append(f"{aid}: sips {e.stderr.decode(errors='ignore')[:120]}")
            continue
        hw, hh = dims(hero)
        lic = info["license"] or "лицензия не указана"
        artist = info["artist"] or "автор не указан"
        manifest.append({
            "id": aid,
            "localPath": f"assets/img/{aid}.jpg",
            "thumbnailPath": f"assets/thumb/{aid}.jpg",
            "width": hw, "height": hh,
            "role": "hero" if aid in hero_ids else "secondary",
            "kind": w["kind"],
            "subject": w["subject"],
            "altRu": w["altRu"],
            "captionRu": w["captionRu"],
            "creator": artist,
            "sourcePageUrl": info["pageUrl"],
            "licenseLabel": lic,
            "licenseUrl": info["licenseUrl"],
            "attributionText": f"{artist} · {lic} · Wikimedia Commons",
            "rightsStatus": "verified" if info["isFree"] else "unresolved",
            "focalPoint": {"x": w["focal"][0], "y": w["focal"][1]},
        })
        if not info["isFree"]:
            problems.append(f"{aid}: лицензия «{lic}» не распознана как свободная — помечено unresolved")
    manifest.sort(key=lambda m: m["id"])
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    total = sum(os.path.getsize(os.path.join(ROOT, m["localPath"])) for m in manifest)
    tot_t = sum(os.path.getsize(os.path.join(ROOT, m["thumbnailPath"])) for m in manifest)
    print(f"{len(manifest)} изображений: {total/1024:.0f} КБ больших, {tot_t/1024:.0f} КБ миниатюр")
    for p in problems:
        print("!", p)


if __name__ == "__main__":
    main()
