#!/usr/bin/env python3
"""Собирает статический сайт в dist/ на двух языках.

Раздельная сборка (по умолчанию): index.html (ru) и kk.html (kk) с встроенными
данными JSON, css/main.css, js/app.js и js/app.kk.js, assets/fonts, assets/img,
assets/thumb. Изображения подгружаются браузером по мере приближения к сцене.

  python3 tools/build.py            # → dist/ (несколько файлов)
  python3 tools/build.py --single   # → dist/index.html и dist/kk.html, самодостаточные

Казахская версия: словари в src/i18n/kk/ накладываются на данные при сборке,
строки интерфейса заменяются в JS-литералах и текстах шаблона.
"""
import base64
import copy
import html
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
DIST = os.path.join(ROOT, "dist")
I18N = os.path.join(SRC, "i18n")

SITE_URL = "https://myredshift.space"
DOMAIN = "myredshift.space"

JS_ORDER = ["00-util.js", "01-data.js", "02-geometry.js", "03-diagrams.js",
            "04-render.js", "05-scroll.js", "06-dialog.js", "07-app.js"]

LANGS = {
    "ru": {"file": "index.html", "js": "js/app.js", "checked": "19 сентября 2026",
           "other": "kk", "other_href": "kk.html", "other_label": "ҚАЗ", "draft": ""},
    "kk": {"file": "kk.html", "js": "js/app.kk.js", "checked": "2026 жылғы 19 қыркүйек",
           "other": "ru", "other_href": "index.html", "other_label": "РУС",
           "draft": "Аудармасы жоба түрінде: ғылыми терминдер тіл маманының тексеруін күтеді."},
}


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


def load_i18n(lang):
    if lang == "ru":
        return None
    base = os.path.join(I18N, lang)
    t = {}
    for name in ("ui", "scenes", "events", "misc"):
        t[name] = json.load(open(os.path.join(base, f"{name}.json"), encoding="utf-8"))
        t[name].pop("_comment", None)
    return t


def tr(ui, s):
    """Перевод строки интерфейса; без перевода — исходная строка."""
    return ui.get(s, s) if s is not None else s


def apply_lang(d, t):
    """Возвращает копию данных с наложенным переводом."""
    d = copy.deepcopy(d)
    ui, sc, ev, misc = t["ui"], t["scenes"], t["events"], t["misc"]
    for s in d["scenes"]:
        o = sc.get(s["id"], {})
        for k in ("title", "lead", "paragraphs", "changeSummary", "detailsSections", "dateLabel"):
            if k in o:
                s[k] = o[k]
        if "fact" in o:
            s["fact"] = o["fact"]
        if "markers" in o:
            for m, mo in zip(s["markers"], o["markers"]):
                m["label"] = mo.get("label", m["label"])
        s["evidenceLabel"] = tr(ui, s["evidenceLabel"])
    for e in d["entities"]:
        o = misc["entities"].get(e["id"], {})
        e["nameRu"] = o.get("nameRu", e["nameRu"])
        e["shortDescription"] = o.get("shortDescription", e["shortDescription"])
    for c in d["chapters"]:
        o = misc["chapters"].get(c["id"], {})
        c["title"] = o.get("title", c["title"])
        c["subtitle"] = o.get("subtitle", c["subtitle"])
    for g in d["glossary"]:
        o = misc["glossary"].get(g["id"], {})
        g["aliases"] = o.get("aliases", g["aliases"])
        g["definition"] = o.get("definition", g["definition"])
        g["term"] = misc.get("glossaryTerms", {}).get(g["id"], g["term"])
    for a in d["assets"]:
        o = misc["assets"].get(a["id"], {})
        for k in ("subject", "altRu", "captionRu"):
            a[k] = o.get(k, a[k])
        a["licenseLabel"] = tr(ui, a["licenseLabel"])
        a["creator"] = tr(ui, a["creator"])
        a["attributionText"] = f"{a['creator']} · {a['licenseLabel']} · Wikimedia Commons"
    for e in d["research"]["timeline"]:
        o = ev.get(e["id"], {})
        e["title"] = o.get("title", e["title"])
        e["body_ru"] = o.get("body", e["body_ru"])
        e["date_label"] = o.get("date_label", e["date_label"])
    for s in d["research"]["sources"]:
        s["title_as_cited"] = misc["sources"].get(s["id"], s["title_as_cited"])
    for h in d["research"]["hubble_measurements"]:
        h["label"] = misc["h0labels"].get(h["label"], h["label"])
        h["model_or_calibration"] = misc["h0models"].get(h["model_or_calibration"], h["model_or_calibration"])
    return d


def translate_js(js, ui):
    """Заменяет русские строковые литералы в одинарных кавычках переводами."""
    for k in sorted(ui, key=len, reverse=True):
        if not re.search(r"[А-Яа-яЁё]", k) or "'" in k:
            continue
        v = ui[k].replace("\\", "\\\\").replace("'", "\\'")
        js = js.replace("'" + k + "'", "'" + v + "'")
    return js


def translate_template(tpl, ui):
    """Переводит текстовые узлы и значения атрибутов шаблона (точное совпадение)."""
    for k in sorted(ui, key=len, reverse=True):
        if not re.search(r"[А-Яа-яЁё]", k):
            continue
        tpl = re.sub(r'(?<=[>"])' + re.escape(k) + r'(?=[<"])', lambda m, v=ui[k]: v, tpl)
    return tpl


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


def noscript_html(d, ui):
    """Простая текстовая версия всех сцен и событий для браузеров без JS."""
    ev = {e["id"]: e for e in d["research"]["timeline"]}
    parts = ["<section class=\"noscript\"><h2>" + html.escape(tr(ui, "Текстовая версия экспозиции")) + "</h2>",
             "<p>" + html.escape(tr(ui, "JavaScript отключён: ниже — тот же материал в виде обычного текста.")) + "</p>"]
    for s in d["scenes"]:
        parts.append(f"<article><h3>{html.escape(s['dateLabel'])} · {html.escape(s['title'])}</h3>")
        parts.append(f"<p><em>{html.escape(s['lead'])}</em></p>")
        for p in s["paragraphs"]:
            parts.append(f"<p>{html.escape(p)}</p>")
        parts.append(f"<p><strong>{html.escape(tr(ui, 'Что изменилось:'))}</strong> {html.escape(s['changeSummary'])}</p>")
        for eid in s["researchEventIds"]:
            e = ev[eid]
            body = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', html.escape(e["body_ru"]))
            parts.append(f"<h4>{html.escape(e['date_label'])} — {html.escape(e['title'])}</h4><p>{body}</p>")
        parts.append("</article>")
    parts.append("</section>")
    return "\n".join(parts)


def build_lang(lang, single, tpl, css, js, data):
    cfg = LANGS[lang]
    t = load_i18n(lang)
    ui = t["ui"] if t else {}
    d = apply_lang(data, t) if t else copy.deepcopy(data)
    d["lang"] = lang
    js_l = translate_js(js, ui) if t else js
    page = translate_template(tpl, ui) if t else tpl
    uris = asset_uris(d["assets"], single)

    page = page.replace('<html lang="ru">', f'<html lang="{lang}">')
    page = page.replace("{{LANG_HREF}}", cfg["other_href"]).replace("{{LANG_OTHER}}", cfg["other"]).replace("{{LANG_LABEL}}", cfg["other_label"])
    page = page.replace("{{DRAFT_NOTE}}", f'<p class="draft-note">{html.escape(cfg["draft"])}</p>' if cfg["draft"] else "")
    page = page.replace("<!--INLINE:fonts-->", "<style>\n" + fonts_css(single) + "\n</style>")
    if single:
        page = page.replace("<!--INLINE:css-->", "<style>\n" + css + "\n</style>")
        page = page.replace("<!--INLINE:js-->", "<script>\n" + js_l.replace("</script", "<\\/script") + "\n</script>")
    else:
        with open(os.path.join(DIST, cfg["js"]), "w", encoding="utf-8") as f:
            f.write(js_l)
        page = page.replace("<!--INLINE:css-->", '<link rel="stylesheet" href="css/main.css">')
        page = page.replace("<!--INLINE:js-->", f'<script src="{cfg["js"]}" defer></script>')
    page = page.replace("<!--INLINE:data-->",
                        '<script type="application/json" id="site-data">' + json_for_script(d) + "</script>\n"
                        '<script type="application/json" id="site-assets">' + json_for_script(uris) + "</script>")
    page = page.replace("<!--INLINE:noscript-->", "<noscript>" + noscript_html(d, ui) + "</noscript>")
    page = page.replace("{{CHECKED_DATE}}", cfg["checked"])
    page = page.replace("{{PAGE_URL}}", SITE_URL + "/" + ("" if cfg["file"] == "index.html" else cfg["file"]))
    page = page.replace("{{OG_IMAGE}}", SITE_URL + "/assets/img/hudf.jpg")
    page = page.replace("{{URL_RU}}", SITE_URL + "/").replace("{{URL_KK}}", SITE_URL + "/kk.html")
    page = page.replace("{{OG_LOCALE}}", "kk_KZ" if lang == "kk" else "ru_RU")
    out = os.path.join(DIST, cfg["file"])
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    leftovers = re.findall(r"<!--INLINE:\w+-->|\{\{\w+\}\}", page)
    if leftovers:
        print(f"! {cfg['file']}: незаполненные плейсхолдеры:", leftovers)
        return None
    return out


def write_site_files():
    """Служебные файлы для публикации: домен, отключение Jekyll, robots, sitemap, 404."""
    with open(os.path.join(DIST, "CNAME"), "w") as f:
        f.write(DOMAIN + "\n")
    open(os.path.join(DIST, ".nojekyll"), "w").close()
    with open(os.path.join(DIST, "robots.txt"), "w") as f:
        f.write(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    with open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n')
        for loc in (SITE_URL + "/", SITE_URL + "/kk.html"):
            f.write(f'  <url><loc>{loc}</loc>'
                    f'<xhtml:link rel="alternate" hreflang="ru" href="{SITE_URL}/"/>'
                    f'<xhtml:link rel="alternate" hreflang="kk" href="{SITE_URL}/kk.html"/></url>\n')
        f.write("</urlset>\n")
    with open(os.path.join(DIST, "404.html"), "w", encoding="utf-8") as f:
        f.write('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
                '<title>Страница не найдена</title><style>html{background:#080D18;color:#F1F4F8;font-family:-apple-system,Segoe UI,Roboto,sans-serif}'
                'body{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px}a{color:#7DCBE8}h1{font-weight:500}</style></head>'
                '<body><div><h1>Такой страницы нет</h1><p>Экспозиция «Вселенная. История расширения» живёт на главной.</p>'
                '<p><a href="/">Перейти к экспозиции</a> · <a href="/kk.html">Қазақша</a></p></div></body></html>')


def main():
    single = "--single" in sys.argv
    os.makedirs(DIST, exist_ok=True)
    tpl = read(os.path.join(SRC, "index.html"))
    css = read(os.path.join(SRC, "css", "main.css"))
    js = "\n;\n".join(read(os.path.join(SRC, "js", n)) for n in JS_ORDER)
    data = load_data()
    if not single:
        os.makedirs(os.path.join(DIST, "css"), exist_ok=True)
        os.makedirs(os.path.join(DIST, "js"), exist_ok=True)
        with open(os.path.join(DIST, "css", "main.css"), "w", encoding="utf-8") as f:
            f.write(css)
        for sub in ("fonts", "img", "thumb"):
            copy_tree(os.path.join(ROOT, "assets", sub), os.path.join(DIST, "assets", sub))
    outs = []
    for lang in LANGS:
        out = build_lang(lang, single, tpl, css, js, data)
        if not out:
            return 1
        outs.append(out)
    write_site_files()
    sizes = ", ".join(f"{os.path.basename(o)} {os.path.getsize(o)/1024:.0f} КБ" for o in outs)
    if single:
        print("dist/ (единые файлы): " + ", ".join(f"{os.path.basename(o)} {os.path.getsize(o)/1024/1024:.2f} МБ" for o in outs))
    else:
        total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(DIST) for f in fs)
        first = os.path.getsize(outs[0]) + os.path.getsize(os.path.join(DIST, "css", "main.css")) + os.path.getsize(os.path.join(DIST, "js", "app.js")) \
            + sum(os.path.getsize(os.path.join(DIST, "assets", "fonts", f)) for f in os.listdir(os.path.join(DIST, "assets", "fonts")))
        print(f"dist/: {sizes}; первая загрузка без изображений ≈ {first/1024:.0f} КБ; всего {total/1024/1024:.1f} МБ")
    return 0


if __name__ == "__main__":
    sys.exit(main())
