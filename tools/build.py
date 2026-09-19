#!/usr/bin/env python3
"""Собирает статический сайт в dist/.

По умолчанию — раздельная сборка: index.html (с встроенными данными JSON),
css/main.css, js/app.js, assets/fonts, assets/img, assets/thumb. Изображения
подгружаются браузером по мере приближения к сцене.

  python3 tools/build.py            # → dist/ (несколько файлов)
  python3 tools/build.py --single   # → dist/index.html, один самодостаточный файл
"""
import base64
import html
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
DIST = os.path.join(ROOT, "dist")

JS_ORDER = ["00-util.js", "01-data.js", "02-geometry.js", "03-diagrams.js",
            "04-render.js", "05-scroll.js", "06-dialog.js", "07-app.js"]


def read(path, mode="r"):
    with open(path, mode, encoding=None if "b" in mode else "utf-8") as f:
        return f.read()


def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(read(path, "rb")).decode("ascii")


def fonts_css(inline):
    faces = json.load(open(os.path.join(ROOT, "assets", "fonts", "fonts.json"), encoding="utf-8"))
    out = []
    for f in faces:
        path = os.path.join(ROOT, "assets", "fonts", f["file"])
        uri = data_uri(path, "font/woff2") if inline else "assets/fonts/" + f["file"]
        out.append(
            f"@font-face{{font-family:'{f['family']}';font-style:{f['style']};"
            f"font-weight:{f['weight']};font-display:swap;src:url({uri}) format('woff2');"
            f"unicode-range:{f['unicodeRange']};}}")
    return "\n".join(out)


def load_data():
    d = {}
    for name in ("scenes", "entities", "chapters", "glossary", "assets"):
        d[name] = json.load(open(os.path.join(SRC, "data", f"{name}.json"), encoding="utf-8"))
    d["research"] = json.load(open(os.path.join(ROOT, "research", "cosmology-data.json"), encoding="utf-8"))
    return d


def asset_uris(assets, inline):
    out = {}
    for a in assets:
        if inline:
            out[a["id"]] = {"img": data_uri(os.path.join(ROOT, a["localPath"]), "image/jpeg"),
                            "thumb": data_uri(os.path.join(ROOT, a["thumbnailPath"]), "image/jpeg")}
        else:
            out[a["id"]] = {"img": a["localPath"], "thumb": a["thumbnailPath"]}
    return out


def copy_tree(src, dst):
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns(".DS_Store", "fonts.json"))


def json_for_script(obj):
    # </script> внутри JSON не должен закрывать тег
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def noscript_html(d):
    """Простая текстовая версия всех сцен и событий для браузеров без JS."""
    ev = {e["id"]: e for e in d["research"]["timeline"]}
    parts = ["<section class=\"noscript\"><h2>Текстовая версия экспозиции</h2>",
             "<p>JavaScript отключён: ниже — тот же материал в виде обычного текста.</p>"]
    for s in d["scenes"]:
        parts.append(f"<article><h3>{html.escape(s['dateLabel'])} · {html.escape(s['title'])}</h3>")
        parts.append(f"<p><em>{html.escape(s['lead'])}</em></p>")
        for p in s["paragraphs"]:
            parts.append(f"<p>{html.escape(p)}</p>")
        parts.append(f"<p><strong>Что изменилось:</strong> {html.escape(s['changeSummary'])}</p>")
        for eid in s["researchEventIds"]:
            e = ev[eid]
            body = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', html.escape(e["body_ru"]))
            parts.append(f"<h4>{html.escape(e['date_label'])} — {html.escape(e['title'])}</h4><p>{body}</p>")
        parts.append("</article>")
    parts.append("</section>")
    return "\n".join(parts)


def main():
    single = "--single" in sys.argv
    os.makedirs(DIST, exist_ok=True)
    tpl = read(os.path.join(SRC, "index.html"))
    css = read(os.path.join(SRC, "css", "main.css"))
    js = "\n;\n".join(read(os.path.join(SRC, "js", n)) for n in JS_ORDER)
    d = load_data()
    uris = asset_uris(d["assets"], single)
    page = tpl
    page = page.replace("<!--INLINE:fonts-->", "<style>\n" + fonts_css(single) + "\n</style>")
    if single:
        page = page.replace("<!--INLINE:css-->", "<style>\n" + css + "\n</style>")
        page = page.replace("<!--INLINE:js-->", "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>")
    else:
        os.makedirs(os.path.join(DIST, "css"), exist_ok=True)
        os.makedirs(os.path.join(DIST, "js"), exist_ok=True)
        with open(os.path.join(DIST, "css", "main.css"), "w", encoding="utf-8") as f:
            f.write(css)
        with open(os.path.join(DIST, "js", "app.js"), "w", encoding="utf-8") as f:
            f.write(js)
        for sub in ("fonts", "img", "thumb"):
            copy_tree(os.path.join(ROOT, "assets", sub), os.path.join(DIST, "assets", sub))
        page = page.replace("<!--INLINE:css-->", '<link rel="stylesheet" href="css/main.css">')
        page = page.replace("<!--INLINE:js-->", '<script src="js/app.js" defer></script>')
    page = page.replace("<!--INLINE:data-->",
                        '<script type="application/json" id="site-data">' + json_for_script(d) + "</script>\n"
                        '<script type="application/json" id="site-assets">' + json_for_script(uris) + "</script>")
    page = page.replace("<!--INLINE:noscript-->", "<noscript>" + noscript_html(d) + "</noscript>")
    page = page.replace("{{CHECKED_DATE}}", "19 сентября 2026")
    out = os.path.join(DIST, "index.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    size = os.path.getsize(out)
    if single:
        print(f"dist/index.html (единый файл): {size/1024/1024:.2f} МБ")
    else:
        total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(DIST) for f in fs)
        first = size + os.path.getsize(os.path.join(DIST, "css", "main.css")) + os.path.getsize(os.path.join(DIST, "js", "app.js")) \
            + sum(os.path.getsize(os.path.join(DIST, "assets", "fonts", f)) for f in os.listdir(os.path.join(DIST, "assets", "fonts")))
        print(f"dist/: index.html {size/1024:.0f} КБ; первая загрузка без изображений ≈ {first/1024:.0f} КБ; всего {total/1024/1024:.1f} МБ")
    leftovers = re.findall(r"<!--INLINE:\w+-->|\{\{\w+\}\}", page)
    if leftovers:
        print("! незаполненные плейсхолдеры:", leftovers)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
