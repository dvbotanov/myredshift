/* Чистая геометрия прокрутки (без DOM) — покрыта тестами tests/geometry.test.js

   W = ширина видимой области экспозиции, H = её высота,
   L = полная ширина ленты = n·W, T = max(0, L − W), k = коэффициент вертикального пути,
   S = T·k, высота секции = H + S, y = clamp(scrollY − sectionTop, 0, S),
   x = S > 0 ? (y / S)·T : 0. */
Cosmo.geometry = (function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function layout(W, H, n, k) {
    k = k == null ? 1 : k;
    var L = n * W;
    var T = Math.max(0, L - W);
    var S = T * k;
    return { W: W, H: H, n: n, k: k, L: L, T: T, S: S, sectionHeight: H + S };
  }

  function xFromScroll(scrollY, sectionTop, S, T) {
    var y = clamp(scrollY - sectionTop, 0, S);
    return S > 0 ? (y / S) * T : 0;
  }

  function scrollFromX(x, sectionTop, S, T) {
    if (T <= 0) return sectionTop;
    return sectionTop + (clamp(x, 0, T) / T) * S;
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
