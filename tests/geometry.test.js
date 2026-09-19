/* Запуск: tools/run_tests.sh (использует jsc из macOS JavaScriptCore) */
var passed = 0, failed = 0;
function eq(a, b, msg) {
  var ok = Math.abs(a - b) < 1e-9;
  if (ok) passed++; else { failed++; print('FAIL ' + msg + ': ' + a + ' !== ' + b); }
}
var G = Cosmo.geometry;

// Модель координат из ТЗ §9.2
var L = G.layout(1440, 900, 20, 1);
eq(L.L, 28800, 'L = n·W');
eq(L.T, 27360, 'T = L − W');
eq(L.S, 27360, 'S = T·k при k=1');
eq(L.sectionHeight, 900 + 27360, 'высота секции = H + S');
var L2 = G.layout(1440, 900, 20, 0.5);
eq(L2.S, 13680, 'S масштабируется k');
eq(G.layout(1000, 700, 1, 1).T, 0, 'одна сцена → T = 0');

// scrollY → x и обратно
var top = 0;
eq(G.xFromScroll(0, top, L.S, L.T), 0, 'начало → x=0');
eq(G.xFromScroll(L.S, top, L.S, L.T), L.T, 'конец → x=T');
eq(G.xFromScroll(-500, top, L.S, L.T), 0, 'выше секции → 0');
eq(G.xFromScroll(L.S + 5000, top, L.S, L.T), L.T, 'ниже секции → T');
eq(G.xFromScroll(1000, 200, L.S, L.T), 800, 'sectionTop вычитается');
eq(G.scrollFromX(G.xFromScroll(12345, 40, L.S, L.T), 40, L.S, L.T), 12345, 'обратное преобразование');
eq(G.scrollFromX(0, 40, 0, 0), 40, 'T=0 → якорь = sectionTop');
eq(G.scrollFromX(L2.T, 0, L2.S, L2.T), L2.S, 'k=0.5: x=T → y=S');

// Границы первой/последней сцены
eq(G.activeIndex(0, 1440, 20), 0, 'первая сцена');
eq(G.activeIndex(L.T, 1440, 20), 19, 'последняя сцена');
eq(G.activeIndex(1440 * 5.49, 1440, 20), 5, 'ближайшая к центру — 5');
eq(G.activeIndex(1440 * 5.51, 1440, 20), 6, 'ближайшая к центру — 6');
eq(G.activeIndex(1e9, 1440, 20), 19, 'за пределами → последняя');
eq(G.sceneX(19, 1440), L.T, 'якорь последней сцены совпадает с T');
eq(G.scrollFromX(G.sceneX(19, 1440), 0, L.S, L.T), L.S, 'переход к последней сцене достигает конца секции');
eq(G.scrollFromX(G.sceneX(0, 1440), 0, L.S, L.T), 0, 'переход к первой сцене — начало секции');

// Прогресс внутри сцены и маркеры
eq(G.progressInScene(1440 * 3.25, 1440, 3), 0.25, 'прогресс 0.25');
eq(G.markerX(2, 0, 1, 1000), 2500, 'один маркер — в центре сцены');
eq(G.markerX(2, 0, 2, 1000), 2000 + 1000 / 3, 'два маркера — на третях');

print(passed + ' проверок пройдено, ' + failed + ' провалено');
if (failed) throw new Error('tests failed');
