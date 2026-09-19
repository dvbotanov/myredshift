/* Инициализация: режим отображения, навигация, клавиатура, адреса сцен */
(function () {
  var U = Cosmo.util;
  var PREF_KEY = 'cosmo-view';
  var scenes, D;

  function pref(v) {
    try { if (v === undefined) return localStorage.getItem(PREF_KEY); localStorage.setItem(PREF_KEY, v); } catch (e) { return null; }
  }

  /* Горизонтальный вид по умолчанию — от 1100×650; вручную его можно включить от 900×600 */
  function screenAllowsHorizontal(manual) {
    return manual ? (window.innerWidth >= 900 && window.innerHeight >= 600)
      : (window.innerWidth >= 1100 && window.innerHeight >= 650);
  }

  function decideView() {
    var p = pref();
    if (window.innerWidth < 700) return 'reading';
    if (p === 'horizontal' || p === 'reading') return p === 'horizontal' && !screenAllowsHorizontal(true) ? 'reading' : p;
    if (U.prefersReducedMotion()) return 'reading';
    return screenAllowsHorizontal(false) ? 'horizontal' : 'reading';
  }

  function currentSceneId() {
    if (Cosmo.scroll.isEnabled()) return scenes[Math.max(0, Cosmo.scroll.state.active)].id;
    // режим чтения: ближайшая к верху сцена
    var best = null, bestD = Infinity;
    document.querySelectorAll('.scene').forEach(function (a) {
      var d = Math.abs(a.getBoundingClientRect().top - 80);
      if (d < bestD) { bestD = d; best = a.dataset.sceneId; }
    });
    return best || scenes[0].id;
  }

  function applyView(view, keepScene) {
    var sid = keepScene ? currentSceneId() : null;
    document.body.dataset.view = view;
    var btn = document.getElementById('btn-view');
    btn.setAttribute('aria-pressed', view === 'reading' ? 'true' : 'false');
    btn.textContent = view === 'reading' ? 'Экспозиция' : 'Вид чтения';
    if (view === 'horizontal') {
      if (!Cosmo.scroll.isEnabled()) Cosmo.scroll.enable(scenes);
      else Cosmo.scroll.relayout();
    } else {
      Cosmo.scroll.disable();
      onReadingScroll();
    }
    if (sid) goTo(sid, { instant: true, push: false, announce: false });
  }

  function goTo(sceneId, opts) {
    opts = opts || {};
    var idx = Cosmo.scroll.indexOf(sceneId);
    if (idx < 0) return;
    if (Cosmo.scroll.isEnabled()) {
      Cosmo.scroll.goTo(idx, opts);
    } else {
      var a = document.getElementById('scene-' + sceneId);
      if (opts.push) history.pushState(null, '', '#scene=' + sceneId);
      if (a) {
        var top = a.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top: top, behavior: (opts.instant || U.prefersReducedMotion()) ? 'auto' : 'smooth' });
      }
      if (opts.announce !== false) Cosmo.scroll.announce(scenes[idx]);
    }
  }

  function sceneFromHash() {
    var m = /scene=([\w-]+)/.exec(location.hash);
    return m && Cosmo.data.byId.scenes[m[1]] ? m[1] : null;
  }

  function drawStars() {
    var c = document.getElementById('stars');
    if (!c) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    var ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var n = Math.round(w * h / 14000);
    for (var i = 0; i < n; i++) {
      var x = rnd() * w, y = rnd() * h, r = 0.4 + rnd() * 0.9;
      ctx.fillStyle = 'rgba(241,244,248,' + (0.25 + rnd() * 0.4).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function bindClicks() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-goto], [data-details], [data-entity], [data-asset], [data-term], [data-fullchart], [data-view-reading], .marker');
      if (!t) return;
      if (t.classList.contains('marker')) {
        e.preventDefault();
        var idx = Number(t.dataset.sceneIndex);
        var already = Cosmo.scroll.isEnabled() && Cosmo.scroll.state.active === idx;
        if (already && t.dataset.entity) Cosmo.dialog.entity(t.dataset.entity, t);
        else goTo(t.dataset.scene, { push: true });
        return;
      }
      if (t.dataset.goto && !t.hasAttribute('data-view-reading')) {
        e.preventDefault();
        if (Cosmo.dialog.isOpen()) Cosmo.dialog.close();
        goTo(t.dataset.goto, { push: true });
        return;
      }
      if (t.dataset.details) { Cosmo.dialog.sceneDetails(Cosmo.data.byId.scenes[t.dataset.details], t); return; }
      if (t.dataset.entity) { Cosmo.dialog.entity(t.dataset.entity, t); return; }
      if (t.dataset.asset) { Cosmo.dialog.asset(t.dataset.asset, t); return; }
      if (t.dataset.term) { Cosmo.dialog.term(t.dataset.term, t); return; }
      if (t.hasAttribute('data-fullchart')) { Cosmo.dialog.fullChart(t); return; }
      if (t.hasAttribute('data-view-reading')) { pref('reading'); applyView('reading', !t.dataset.goto); if (t.dataset.goto) goTo(t.dataset.goto, { push: true }); return; }
    });
    document.getElementById('btn-prev').addEventListener('click', function () { if (Cosmo.scroll.isEnabled()) Cosmo.scroll.goTo(Cosmo.scroll.state.active - 1, { push: true }); });
    document.getElementById('btn-next').addEventListener('click', function () { if (Cosmo.scroll.isEnabled()) Cosmo.scroll.goTo(Cosmo.scroll.state.active + 1, { push: true }); });
    document.getElementById('btn-chapters').addEventListener('click', function (e) { Cosmo.dialog.chapters(e.currentTarget); });
    document.getElementById('btn-view').addEventListener('click', function () {
      var next = document.body.dataset.view === 'reading' ? 'horizontal' : 'reading';
      if (next === 'horizontal' && !screenAllowsHorizontal(true)) return;
      pref(next);
      applyView(next, true);
    });
  }

  function bindKeys() {
    // стрелки только внутри блока навигации / шкалы
    var dock = document.getElementById('dock');
    dock.addEventListener('keydown', function (e) {
      if (!Cosmo.scroll.isEnabled()) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); Cosmo.scroll.goTo(Cosmo.scroll.state.active + 1, { push: true }); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); Cosmo.scroll.goTo(Cosmo.scroll.state.active - 1, { push: true }); }
      else if (e.key === 'Home') { e.preventDefault(); Cosmo.scroll.goTo(0, { push: true }); }
      else if (e.key === 'End') { e.preventDefault(); Cosmo.scroll.goTo(scenes.length - 1, { push: true }); }
    });
  }

  /* В режиме чтения верхняя строка показывает дату сцены, ближайшей к верху окна */
  var readingRaf = null;
  function onReadingScroll() {
    if (readingRaf || document.body.dataset.view !== 'reading') return;
    readingRaf = requestAnimationFrame(function () {
      readingRaf = null;
      var s = Cosmo.data.byId.scenes[currentSceneId()];
      var now = document.getElementById('topbar-now');
      if (s && now) now.textContent = s.dateLabel + ' · ' + s.title;
    });
  }

  function bindHistory() {
    window.addEventListener('popstate', function () {
      var sid = sceneFromHash();
      if (sid) goTo(sid, { push: false, instant: true, announce: false });
    });
    window.addEventListener('hashchange', function () {
      // якоря вне экспозиции (#glossary, #sources) браузер обрабатывает сам
    });
  }

  function initIntro() {
    var bg = document.getElementById('intro-bg'), cr = document.getElementById('intro-credit');
    var a = Cosmo.data.byId.assets.hudf, uri = Cosmo.data.assetUri('hudf', 'img');
    if (bg && uri) { bg.src = uri; bg.width = a.width; bg.height = a.height; }
    if (cr && a) cr.innerHTML = U.fmt(a.captionRu) + '. ' + Cosmo.render.credit(a);
  }

  function init() {
    D = Cosmo.data.load();
    scenes = D.scenes.slice().sort(function (a, b) { return a.order - b.order; });
    document.getElementById('track').appendChild(Cosmo.render.track(scenes));
    document.getElementById('overview-chapters').innerHTML = Cosmo.render.overview(D.chapters);
    document.getElementById('chapters-list').innerHTML = Cosmo.render.chaptersSection(D.chapters);
    document.getElementById('chronology-list').innerHTML = Cosmo.render.chronology();
    document.getElementById('glossary-list').innerHTML = Cosmo.render.glossary(D.glossary);
    document.getElementById('sources-by-scene').innerHTML = Cosmo.render.sourcesByScene(scenes);
    document.getElementById('image-credits').innerHTML = Cosmo.render.imageCredits(D.assets);
    document.getElementById('sources-list').innerHTML = Cosmo.render.sourcesList(D.research.sources);
    Cosmo.dialog.init();
    bindClicks(); bindKeys(); bindHistory();
    window.addEventListener('scroll', onReadingScroll, { passive: true });
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    var view = decideView();
    applyView(view, false);
    drawStars();
    window.addEventListener('resize', U.debounce(function () {
      drawStars();
      // если экран перестал подходить под горизонтальный вид — переключаемся
      var v = decideView();
      if (v !== document.body.dataset.view) applyView(v, true);
    }, 200));

    initIntro();
    var sid = sceneFromHash();
    if (sid) goTo(sid, { push: false, instant: true, announce: false });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
