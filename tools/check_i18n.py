#!/usr/bin/env python3
"""Проверка полноты казахского перевода.

Сверяет: русские литералы в src/js/*.js и тексты шаблона — со словарём ui.json;
сцены, события, сущности, главы, словарь, изображения, метки H₀ — с файлами перевода.
  python3 tools/check_i18n.py
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CYR = re.compile(r"[А-Яа-яЁё]")


def load(path):
    d = json.load(open(os.path.join(ROOT, path), encoding="utf-8"))
    if isinstance(d, dict):
        d.pop("_comment", None)
    return d


def js_literals():
    out = set()
    for f in sorted(glob.glob(os.path.join(ROOT, "src", "js", "*.js"))):
        src = open(f, encoding="utf-8").read()
        src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)          # блочные комментарии
        src = re.sub(r"(^|[^:])//[^\n]*", r"\1", src)             # строчные комментарии
        for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'", src):
            t = m.group(1)
            if CYR.search(t):
                out.add(t)
    return out


def template_strings():
    s = open(os.path.join(ROOT, "src", "index.html"), encoding="utf-8").read()
    out = set()
    for m in re.finditer(r">([^<>]+)<", s):
        t = m.group(1).strip()
        if CYR.search(t):
            out.add(t)
    for m in re.finditer(r'(?:aria-label|content|alt|title)="([^"]+)"', s):
        t = m.group(1).strip()
        if CYR.search(t):
            out.add(t)
    return out


def main():
    errors = []
    ui = load("src/i18n/kk/ui.json")
    sc = load("src/i18n/kk/scenes.json")
    ev = load("src/i18n/kk/events.json")
    misc = load("src/i18n/kk/misc.json")
    scenes = load("src/data/scenes.json")
    entities = load("src/data/entities.json")
    chapters = load("src/data/chapters.json")
    glossary = load("src/data/glossary.json")
    assets = load("src/data/assets.json")
    research = json.load(open(os.path.join(ROOT, "research", "cosmology-data.json"), encoding="utf-8"))

    for lit in sorted(js_literals()):
        if lit not in ui:
            errors.append(f"нет перевода JS-литерала: {lit[:90]!r}")
    for t in sorted(template_strings()):
        if t not in ui:
            errors.append(f"нет перевода строки шаблона: {t[:90]!r}")
    for s in scenes:
        o = sc.get(s["id"])
        if not o:
            errors.append(f"сцена {s['id']}: нет перевода")
            continue
        for k in ("title", "lead", "paragraphs", "changeSummary", "detailsSections"):
            if k not in o:
                errors.append(f"сцена {s['id']}: нет поля {k}")
        if len(o.get("paragraphs", [])) != len(s["paragraphs"]):
            errors.append(f"сцена {s['id']}: число абзацев отличается")
        if len(o.get("detailsSections", [])) != len(s["detailsSections"]):
            errors.append(f"сцена {s['id']}: число секций «Подробнее» отличается")
        if (s["fact"] is None) != (o.get("fact") is None) and s["fact"] is not None:
            errors.append(f"сцена {s['id']}: нет перевода числовой карточки")
        if CYR.search(s["dateLabel"]) and "dateLabel" not in o:
            errors.append(f"сцена {s['id']}: dateLabel «{s['dateLabel']}» не переведён")
        for m in s["markers"]:
            if CYR.search(m["label"]) and "markers" not in o:
                errors.append(f"сцена {s['id']}: метка маркера «{m['label']}» не переведена")
    for e in research["timeline"]:
        o = ev.get(e["id"])
        if not o or "title" not in o or "body" not in o:
            errors.append(f"событие {e['id']}: нет перевода")
        elif CYR.search(e["date_label"]) and "date_label" not in o:
            errors.append(f"событие {e['id']}: date_label «{e['date_label']}» не переведён")
        elif len(re.findall(r"\]\(", o["body"])) != len(re.findall(r"\]\(", e["body_ru"])):
            errors.append(f"событие {e['id']}: число ссылок в теле отличается")
    for e in entities:
        if e["id"] not in misc["entities"]:
            errors.append(f"сущность {e['id']}: нет перевода")
    for c in chapters:
        if c["id"] not in misc["chapters"]:
            errors.append(f"глава {c['id']}: нет перевода")
    for g in glossary:
        if g["id"] not in misc["glossary"]:
            errors.append(f"словарь {g['id']}: нет перевода")
        if CYR.search(g["term"]) and g["id"] not in misc.get("glossaryTerms", {}):
            errors.append(f"словарь {g['id']}: термин «{g['term']}» не переведён")
    for a in assets:
        if a["id"] not in misc["assets"]:
            errors.append(f"изображение {a['id']}: нет перевода подписи")
    for h in research["hubble_measurements"]:
        if CYR.search(h["label"]) and h["label"] not in misc["h0labels"]:
            errors.append(f"H₀ {h['id']}: метка «{h['label']}» не переведена")
        if CYR.search(h["model_or_calibration"] or "") and h["model_or_calibration"] not in misc["h0models"]:
            errors.append(f"H₀ {h['id']}: модель «{h['model_or_calibration']}» не переведена")
    for s in research["sources"]:
        if CYR.search(s["title_as_cited"]) and s["id"] not in misc["sources"]:
            errors.append(f"источник {s['id']}: название не переведено")
    for e in errors:
        print("!", e)
    print(f"i18n kk: {len(errors)} ошибок")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
