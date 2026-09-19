/* Чистая геометрия прокрутки (без DOM) — покрыта тестами tests/geometry.test.js

   W = ширина видимой области, H = её высота, n = число сцен,
   k = коэффициент вертикального пути (сколько экранов прокрутки на одну сцену),
   s = W·k — путь прокрутки на одну сцену,
   p = доля «полки»: в первой части пути сцена стоит неподвижно (x = i·W),
       в оставшейся — лента переезжает к следующей сцене. При p = 0 связь линейная.
   L = n·W, T = max(0, L − W), S = s·((n − 1) + p) — последняя сцена тоже получает полку,
   высота секции = H + S, y = clamp(scrollY − sectionTop, 0, S), x = f(y). */
Cosmo.geometry = (function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function layout(W, H, n, k, p) {
    k = k == null ? 1 : k;
    p = p == null ? 0 : clamp(p, 0, 0.9);
    var L = n * W;
    var T = Math.max(0, L - W);
    var s = W * k;
    var S = n > 1 ? s * ((n - 1) + p) : 0;
    return { W: W, H: H, n: n, k: k, p: p, L: L, T: T, s: s, S: S, sectionHeight: H + S };
  }

  function xFromScroll(scrollY, sectionTop, lay) {
    if (lay.n <= 1 || lay.s <= 0) return 0;
    var y = clamp(scrollY - sectionTop, 0, lay.S);
    var i = Math.min(lay.n - 1, Math.floor(y / lay.s));
    if (i >= lay.n - 1) return (lay.n - 1) * lay.W;
    var t = (y - i * lay.s) / lay.s;
    if (t < lay.p) return i * lay.W;
    return i * lay.W + lay.W * (t - lay.p) / (1 - lay.p);
  }

  /* Обратное преобразование: x → scrollY. Для якоря сцены (x = i·W) — середина её полки. */
  function scrollFromX(x, sectionTop, lay) {
    if (lay.n <= 1 || lay.T <= 0) return sectionTop;
    x = clamp(x, 0, lay.T);
    var i = Math.floor(x / lay.W + 1e-9);
    var f = x / lay.W - i;
    if (i >= lay.n - 1) { i = lay.n - 1; f = 0; }
    var y = f < 1e-9 ? i * lay.s + lay.p * lay.s / 2 : i * lay.s + lay.s * (lay.p + f * (1 - lay.p));
    return sectionTop + Math.min(y, lay.S);
  }

  function sceneX(i, W) { return i * W; }

  function activeIndex(x, W, n) {
    if (n <= 0 || W <= 0) return 0;
    return clamp(Math.round(x / W), 0, n - 1);
  }

  function progressInScene(x, W, i) {
    return W > 0 ? (x - i * W) / W : 0;
  }

  /* Позиция маркера j из m внутри сцены i (равномерно, с полями) */
  function markerX(i, j, m, W) {
    return i * W + W * ((j + 1) / (m + 1));
  }

  return { layout: layout, xFromScroll: xFromScroll, scrollFromX: scrollFromX, sceneX: sceneX,
    activeIndex: activeIndex, progressInScene: progressInScene, markerX: markerX };
})();
