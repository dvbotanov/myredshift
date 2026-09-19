#!/bin/sh
# Юнит-тесты геометрии прокрутки через JavaScriptCore (macOS) + проверка данных
set -e
cd "$(dirname "$0")/.."
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
cat src/js/00-util.js src/js/02-geometry.js tests/geometry.test.js > /tmp/cosmo-tests.js
"$JSC" /tmp/cosmo-tests.js
python3 tools/check_data.py
python3 tools/check_i18n.py
