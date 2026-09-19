/* Запуск: tools/run_tests.sh (использует jsc из macOS JavaScriptCore) */
var passed = 0, failed = 0;
function eq(a, b, msg) {
  var ok = Math.abs(a - b) < 1e-6;
  if (ok) passed++; else { failed++; print('FAIL ' + msg + ': ' + a + ' !== ' + b); }
}
var G = Cosmo.geometry;

// --- Линейная модель (p = 0), формулы ТЗ §9.2 ---
var L = G.layout(1440, 900, 20, 1, 0);
eq(L.L, 28800, 'L = n·W');
eq(L.T, 27360, 'T = L − W');
eq(L.S, 27360, 'S = T·k при k=1, p=0');
eq(L.sectionHeight, 900 + 27360, 'высота секции = H + S');
eq(G.layout(1440, 900, 20, 0.5, 0).S, 13680, 'S масштабируется k');
eq(G.layout(1000, 700, 1, 1, 0).T, 0, 'одна сцена → T = 0');
eq(G.layout(1000, 700, 1, 1, 0).S, 0, 'одна сцена → S = 0');

eq(G.xFromScroll(0, 0, L), 0, 'начало → x=0');
eq(G.xFromScroll(L.S, 0, L), L.T, 'конец → x=T');
eq(G.xFromScroll(-500, 0, L), 0, 'выше секции → 0');
eq(G.xFromScroll(L.S + 5000, 0, L), L.T, 'ниже секции → T');
eq(G.xFromScroll(1000, 200, L), 800, 'sectionTop вычитается');
eq(G.scrollFromX(G.xFromScroll(12345, 40, L), 40, L), 12345, 'обратное преобразование (p=0)');
eq(G.scrollFromX(0, 40, G.layout(1000, 700, 1, 1, 0)), 40, 'T=0 → якорь = sectionTop');

// --- Границы первой/последней сцены ---
eq(G.activeIndex(0, 1440, 20), 0, 'первая сцена');
eq(G.activeIndex(L.T, 1440, 20), 19, 'последняя сцена');
eq(G.activeIndex(1440 * 5.49, 1440, 20), 5, 'ближайшая к центру — 5');
eq(G.activeIndex(1440 * 5.51, 1440, 20), 6, 'ближайшая к центру — 6');
eq(G.activeIndex(1e9, 1440, 20), 19, 'за пределами → последняя');
eq(G.sceneX(19, 1440), L.T, 'якорь последней сцены совпадает с T');
eq(G.scrollFromX(G.sceneX(19, 1440), 0, L), L.S, 'p=0: переход к последней сцене достигает конца секции');
eq(G.scrollFromX(G.sceneX(0, 1440), 0, L), 0, 'p=0: переход к первой сцене — начало секции');

// --- Модель с полками (p = 0.45) ---
var P = G.layout(1440, 900, 20, 1, 0.45);
eq(P.s, 1440, 's = W·k');
eq(P.S, 1440 * (19 + 0.45), 'S = s·((n−1)+p)');
eq(G.xFromScroll(0, 0, P), 0, 'полка сцены 0: начало');
eq(G.xFromScroll(1440 * 0.44, 0, P), 0, 'полка сцены 0: сцена стоит почти до конца полки');
eq(G.xFromScroll(1440 * 0.45, 0, P), 0, 'граница полки → x ещё 0');
eq(G.xFromScroll(1440 * (0.45 + 0.55 / 2), 0, P), 720, 'середина перехода → полсцены');
eq(G.xFromScroll(1440, 0, P), 1440, 'конец пути первой сцены → сцена 1');
eq(G.xFromScroll(1440 * 1.3, 0, P), 1440, 'полка сцены 1');
eq(G.xFromScroll(P.S, 0, P), P.T, 'конец секции → последняя сцена');
eq(G.xFromScroll(P.S - 1, 0, P), P.T, 'последняя полка удерживает x = T');
eq(G.scrollFromX(G.sceneX(3, 1440), 0, P), 3 * 1440 + 0.45 * 1440 / 2, 'якорь сцены — середина её полки');
eq(G.scrollFromX(G.sceneX(19, 1440), 0, P), 19 * 1440 + 0.45 * 1440 / 2, 'якорь последней сцены внутри секции');
eq(G.xFromScroll(G.scrollFromX(1440 * 7.3, 0, P), 0, P), 1440 * 7.3, 'обратное преобразование внутри перехода');
eq(G.xFromScroll(G.scrollFromX(G.sceneX(11, 1440), 0, P), 0, P), 1440 * 11, 'якорь сцены возвращает её x');
var back = G.xFromScroll(G.scrollFromX(G.sceneX(11, 1440), 0, P) - 300, 0, P);
eq(back, 1440 * 11, 'шаг назад с якоря на 300 px остаётся на полке');

// --- Прогресс и маркеры ---
eq(G.progressInScene(1440 * 3.25, 1440, 3), 0.25, 'прогресс 0.25');
eq(G.markerX(2, 0, 1, 1000), 2500, 'один маркер — в центре сцены');
eq(G.markerX(2, 0, 2, 1000), 2000 + 1000 / 3, 'два маркера — на третях');

print(passed + ' проверок пройдено, ' + failed + ' провалено');
if (failed) throw new Error('tests failed');
