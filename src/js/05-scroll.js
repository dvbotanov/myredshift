/* Контроллер прокрутки: вертикальный scroll документа → горизонтальное смещение ленты.
   Один rAF на кадр, измерения только при инициализации и resize. */
Cosmo.scroll = (function () {
  var G = Cosmo.geometry, U = Cosmo.util;
  var st = {
    enabled: false, scenes: [], n: 0, W: 0, H: 0, T: 0, S: 0, k: 1, sectionTop: 0,
    x: 0, active: -1, raf: null, els: {}, listeners: [], pendingRestore: null
  };

  function q(id) { return document.getElementById(id); }

  function measure() {
    var vp = st.els.viewport;
    st.W = vp.clientWidth;
    st.H = st.els.stage.clientHeight;
    var lay = G.layout(st.W, st.H, st.n, st.k);
    st.T = lay.T; st.S = lay.S;
    document.documentElement.style.setProperty('--W', st.W + 'px');
    st.els.section.style.height = lay.sectionHeight + 'px';
    st.sectionTop = st.els.section.getBoundingClientRect().top + window.scrollY;
    st.els.ribbon.innerHTML = Cosmo.render.ribbon(st.scenes, st.W);
  }

  function schedule() {
    if (st.raf) return;
    st.raf = requestAnimationFrame(function () { st.raf = null; update(); });
  }

  function update() {
    if (!st.enabled) return;
    st.x = G.xFromScroll(window.scrollY, st.sectionTop, st.S, st.T);
    var tx = 'translate3d(' + (-st.x).toFixed(2) + 'px,0,0)';
    st.els.track.style.transform = tx;
    st.els.ribbon.style.transform = tx;
    var idx = G.activeIndex(st.x, st.W, st.n);
    if (idx !== st.active) setActive(idx);
    var fill = q('progress-fill');
    if (fill) fill.style.width = (st.T > 0 ? st.x / st.T * 100 : 0).toFixed(2) + '%';
  }

  function setActive(idx) {
    var prev = st.active;
    st.active = idx;
    var s = st.scenes[idx];
    st.els.track.querySelectorAll('.scene').forEach(function (a, i) {
      var far = Math.abs(i - idx) > 1;
      a.dataset.far = far ? 'true' : 'false';
      if (far) a.setAttribute('inert', ''); else a.removeAttribute('inert');
      a.classList.toggle('is-active', i === idx);
      // текущую, предыдущую и следующую сцены подгружаем заранее
      if (!far) a.querySelectorAll('img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; });
    });
    st.els.ribbon.querySelectorAll('.marker').forEach(function (m) {
      var mi = Number(m.dataset.sceneIndex), cur = mi === idx;
      if (cur) m.setAttribute('aria-current', 'true'); else m.removeAttribute('aria-current');
      // маркеры далеко за пределами окна не получают фокус с клавиатуры
      m.tabIndex = Math.abs(mi - idx) > 1 ? -1 : 0;
    });
    var chapter = Cosmo.data.get().chapters.filter(function (c) { return c.sceneIds.indexOf(s.id) >= 0; })[0];
    document.querySelectorAll('.chapter-btn').forEach(function (b) {
      if (chapter && b.dataset.chapter === chapter.id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    var prevBtn = q('btn-prev'), nextBtn = q('btn-next'), counter = q('scene-counter'), now = q('topbar-now');
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === st.n - 1;
    if (counter) counter.textContent = (idx + 1) + ' / ' + st.n;
    if (now) now.textContent = s.dateLabel + ' · ' + s.title;
    // адрес сцены без накопления истории
    if (prev !== -1 && location.hash !== '#scene=' + s.id) history.replaceState(history.state, '', '#scene=' + s.id);
    st.listeners.forEach(function (f) { f(s, idx, prev); });
  }

  function goTo(idx, opts) {
    opts = opts || {};
    idx = U.clamp(idx, 0, st.n - 1);
    var y = G.scrollFromX(G.sceneX(idx, st.W), st.sectionTop, st.S, st.T);
    var behavior = (opts.instant || U.prefersReducedMotion()) ? 'auto' : 'smooth';
    if (opts.push) history.pushState(null, '', '#scene=' + st.scenes[idx].id);
    window.scrollTo({ top: Math.round(y), behavior: behavior });
    if (opts.announce !== false) announce(st.scenes[idx]);
  }

  function announce(s) {
    var live = q('live');
    if (live) { live.textContent = ''; setTimeout(function () { live.textContent = s.dateLabel + '. ' + s.title; }, 30); }
  }

  function indexOf(sceneId) {
    for (var i = 0; i < st.n; i++) if (st.scenes[i].id === sceneId) return i;
    return -1;
  }

  /* Сохранить сцену и относительный прогресс, перемерить, восстановить близкое положение */
  function relayout() {
    if (!st.enabled) return;
    if (Cosmo.dialog && Cosmo.dialog.isOpen()) { st.pendingRestore = true; return; }
    var idx = Math.max(0, st.active);
    var p = G.progressInScene(st.x, st.W, idx);
    measure();
    var x = G.sceneX(idx, st.W) + p * st.W;
    window.scrollTo({ top: Math.round(G.scrollFromX(x, st.sectionTop, st.S, st.T)), behavior: 'auto' });
    st.active = -1;
    update();
  }

  var onScroll = function () { schedule(); };
  var onResize = U.debounce(relayout, 150);

  function enable(scenes) {
    st.scenes = scenes; st.n = scenes.length;
    st.els = { section: q('story'), stage: q('stage'), viewport: q('viewport'), track: q('track'), ribbon: q('ribbon') };
    st.enabled = true;
    measure();
    st.active = -1;
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // в скрытой вкладке rAF приостановлен — при возврате видимости догоняем состояние
    document.addEventListener('visibilitychange', onVisible);
  }

  function onVisible() { if (st.enabled && document.visibilityState === 'visible') schedule(); }

  function disable() {
    if (!st.enabled) return;
    st.enabled = false;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisible);
    st.els.section.style.height = '';
    st.els.track.style.transform = '';
    st.els.ribbon.style.transform = '';
    st.els.track.querySelectorAll('.scene').forEach(function (a) { a.removeAttribute('inert'); a.dataset.far = 'false'; });
  }

  function afterDialog() {
    if (st.pendingRestore) { st.pendingRestore = null; relayout(); }
  }

  return { enable: enable, disable: disable, goTo: goTo, update: update, indexOf: indexOf, relayout: relayout, afterDialog: afterDialog, announce: announce,
    onActive: function (f) { st.listeners.push(f); }, state: st, isEnabled: function () { return st.enabled; } };
})();
