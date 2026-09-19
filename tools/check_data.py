#!/usr/bin/env python3
"""Проверка целостности данных: сцены → события → источники → изображения → сущности.

  python3 tools/check_data.py
Код возврата 1 при любой ошибке.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(name):
    return json.load(open(os.path.join(ROOT, "src", "data", name), encoding="utf-8"))


def main():
    errors, warnings = [], []
    scenes = load("scenes.json")
    entities = load("entities.json")
    chapters = load("chapters.json")
    glossary = load("glossary.json")
    assets = load("assets.json")
    research = json.load(open(os.path.join(ROOT, "research", "cosmology-data.json"), encoding="utf-8"))

    ev = {e["id"]: e for e in research["timeline"]}
    src = {s["id"]: s for s in research["sources"]}
    ent = {e["id"]: e for e in entities}
    ast = {a["id"]: a for a in assets}
    scene_ids = [s["id"] for s in scenes]

    if len(scenes) != 20:
        errors.append(f"сцен {len(scenes)}, ожидается 20")
    if len(ev) != 43 or sorted(ev) != [f"E{i:03d}" for i in range(1, 44)]:
        errors.append("в базе не 43 события E001–E043")
    if [s["order"] for s in scenes] != list(range(1, 21)):
        errors.append("порядок сцен order не равен 1..20")

    used_events = set()
    for s in scenes:
        for eid in s["researchEventIds"]:
            if eid not in ev:
                errors.append(f"{s['id']}: нет события {eid}")
            used_events.add(eid)
        for e in s["entityIds"]:
            if e not in ent:
                errors.append(f"{s['id']}: нет сущности {e}")
        for a in [s["heroAssetId"]] + s["secondaryAssetIds"]:
            if a != "prologue-sky" and a not in ast:
                errors.append(f"{s['id']}: нет изображения {a}")
        for sid in s["sourceIds"]:
            if sid not in src:
                errors.append(f"{s['id']}: нет источника {sid}")
        for m in s["markers"]:
            if m.get("entityId") and m["entityId"] not in ent:
                errors.append(f"{s['id']}: маркер ссылается на несуществующую сущность {m['entityId']}")
        words = len(" ".join(s["paragraphs"]).split())
        if not (50 <= words <= 140):
            warnings.append(f"{s['id']}: {words} слов в основном тексте (ориентир 70–120)")
        tw = len(s["title"].split())
        if not (3 <= tw <= 9):
            warnings.append(f"{s['id']}: заголовок из {tw} слов (ориентир 4–9)")
        if s["evidenceLabel"] not in ("Идея", "Измерение", "Пересмотр", "Открытый вопрос", "Пролог"):
            errors.append(f"{s['id']}: неизвестная метка {s['evidenceLabel']}")
    missing = sorted(set(ev) - used_events)
    if missing:
        warnings.append("события без сцены (доступны только в полной хронологии): " + ", ".join(missing))

    for e in entities:
        if e["assetId"] and e["assetId"] not in ast:
            errors.append(f"сущность {e['id']}: нет изображения {e['assetId']}")
        for eid in e["relatedEventIds"]:
            if eid not in ev:
                errors.append(f"сущность {e['id']}: нет события {eid}")
    for c in chapters:
        for sid in c["sceneIds"]:
            if sid not in scene_ids:
                errors.append(f"глава {c['id']}: нет сцены {sid}")
    covered = [sid for c in chapters for sid in c["sceneIds"]]
    if sorted(covered) != sorted(scene_ids):
        errors.append("главы покрывают не все сцены или содержат дубликаты")
    for g in glossary:
        for sid in g["sourceIds"]:
            if sid not in src:
                errors.append(f"словарь {g['id']}: нет источника {sid}")
    for a in assets:
        for p in (a["localPath"], a["thumbnailPath"]):
            if not os.path.exists(os.path.join(ROOT, p)):
                errors.append(f"изображение {a['id']}: нет файла {p}")
        if a["rightsStatus"] != "verified":
            warnings.append(f"изображение {a['id']}: права не подтверждены ({a['licenseLabel']})")
    for e in research["timeline"]:
        for sid in e["source_ids"]:
            if sid not in src:
                errors.append(f"событие {e['id']}: нет источника {sid}")
    for h in research["hubble_measurements"]:
        if h["unit"] != "km s^-1 Mpc^-1":
            errors.append(f"{h['id']}: неожиданная единица {h['unit']}")
        if (h["error_minus"] is None) != (h["error_plus"] is None):
            errors.append(f"{h['id']}: ошибка задана только с одной стороны")

    blob = json.dumps(scenes, ensure_ascii=False) + json.dumps(glossary, ensure_ascii=False)
    if re.search(r"lorem ipsum", blob, re.I):
        errors.append("найден Lorem ipsum")
    if research["last_checked"] != "2026-09-19":
        errors.append("дата проверки в базе изменилась; обновите подпись на сайте осознанно")

    for w in warnings:
        print("~", w)
    for e in errors:
        print("!", e)
    print(f"{len(errors)} ошибок, {len(warnings)} предупреждений")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
