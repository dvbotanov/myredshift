#!/usr/bin/env python3
"""Обёртка над API Wikimedia Commons: поиск файлов и метаданные лицензий.

Использование:
  python3 tools/commons.py search "Vesto Slipher"        # кандидаты
  python3 tools/commons.py info "File:Leavitt aavso.jpg" # метаданные одного файла
"""
import html
import json
import re
import sys
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "CosmologySiteBuilder/0.1 (dmitriy.botanov@gmail.com) python-urllib"
FREE = ("Public domain", "Общественное достояние", "С указанием авторства", "CC0", "CC BY", "CC BY-SA", "CC BY 4.0", "CC BY 3.0",
        "CC BY 2.0", "CC BY 2.5", "CC BY-SA 4.0", "CC BY-SA 3.0", "CC BY-SA 2.0",
        "CC BY-SA 2.5", "CC BY 3.0 IGO", "CC BY-SA 3.0 IGO", "CC BY 4.0 IGO",
        "CC BY-SA 4.0 IGO", "Attribution", "PD", "CC BY-SA 1.0", "CC BY 1.0")


def api(params):
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def strip(s):
    s = re.sub(r"<span[^>]*display:\s*none[^>]*>.*?</span>", "", s or "", flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s).strip()
    s = re.sub(r"\s+", " ", s)
    return RU.get(s, s)


RU = {"Unknown author": "Автор неизвестен", "Public domain": "Общественное достояние",
      "Unknown authorUnknown author": "Автор неизвестен", "Attribution": "С указанием авторства"}


def info(title, width=1600, thumb=320):
    if not title.startswith("File:"):
        title = "File:" + title
    d = api({"action": "query", "titles": title, "prop": "imageinfo",
             "iiprop": "url|extmetadata|size|mime", "iiurlwidth": width,
             "redirects": 1})
    page = list(d["query"]["pages"].values())[0]
    if "missing" in page or "imageinfo" not in page:
        return None
    ii = page["imageinfo"][0]
    em = ii.get("extmetadata", {})

    def g(k):
        return strip(em.get(k, {}).get("value", ""))

    lic = g("LicenseShortName")
    return {
        "title": page["title"],
        "pageUrl": ii.get("descriptionurl"),
        "originalUrl": ii.get("url"),
        "thumbUrl": ii.get("thumburl"),
        "width": ii.get("width"), "height": ii.get("height"), "mime": ii.get("mime"),
        "license": lic,
        "licenseUrl": g("LicenseUrl"),
        "artist": g("Artist"),
        "credit": g("Credit"),
        "usageTerms": g("UsageTerms"),
        "attributionRequired": g("AttributionRequired"),
        "isFree": any(lic.startswith(f) for f in FREE) if lic else False,
    }


def search(query, limit=6):
    d = api({"action": "query", "list": "search", "srsearch": query,
             "srnamespace": 6, "srlimit": limit})
    return [r["title"] for r in d["query"]["search"]]


def main():
    cmd, arg = sys.argv[1], sys.argv[2]
    if cmd == "search":
        for t in search(arg):
            i = info(t)
            if not i:
                continue
            flag = "OK " if i["isFree"] else "?? "
            print(f"  {flag}{t} | {i['license']} | {i['width']}x{i['height']} | {i['artist'][:40]}")
    elif cmd == "info":
        print(json.dumps(info(arg), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
