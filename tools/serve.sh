#!/bin/sh
# Локальный запуск: собрать и раздать dist/ на http://localhost:8765
cd "$(dirname "$0")/.." && python3 tools/build.py && python3 -m http.server 8765 --directory dist
