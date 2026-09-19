/* Диалог «Подробнее», карточки людей и приборов, термины, полный график */
Cosmo.dialog = (function () {
  var U = Cosmo.util, esc = U.esc, fmt = U.fmt;
  var dlg, body, title, opener = null, savedScroll = 0;

  function init() {
    dlg = document.getElementById('dialog');
    body = document.getElementById('dialog-body');
    title = document.getElementById('dialog-title');
    document.getElementById('dialog-close').addEventListener('click', close);
    dlg.addEventListener('close', onClosed);
    dlg.addEventListener('click', function (e) {
      // клик по подложке
      var r = dlg.getBoundingClientRect();
      if (e.target === dlg && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) close();
    });
    body.addEventListener('click', function (e) {
      var pt = e.target.closest('.h0-point');
      if (pt) { showH0(pt); return; }
      var tab = e.target.closest('.tab');
      if (tab) { selectTab(tab); return; }
    });
    body.addEventListener('keydown', function (e) {
      var pt = e.target.closest('.h0-point');
      if (pt && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showH0(pt); }
    });
    // Пока диалог открыт, фон не прокручивается: блокируем колесо и касания вне диалога.
    // Это не глобальный перехват основной механики — только на время модального окна.
    var block = function (e) { if (dlg.open && !dlg.contains(e.target)) e.preventDefault(); };
    document.addEventListener('wheel', block, { passive: false });
    document.addEventListener('touchmove', block, { passive: false });
  }

  function showH0(pt) {
    var panel = pt.closest('.h0-chart').querySelector('[data-h0-detail]');
    if (panel) panel.innerHTML = Cosmo.diagrams.h0Detail(pt.dataset.h0);
  }

  function selectTab(tab) {
    var tabs = tab.parentNode.querySelectorAll('.tab');
    tabs.forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
    var wrap = tab.closest('[data-tabs]');
    wrap.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== tab.dataset.tab; });
  }

  function open(t, html, openerEl) {
    opener = openerEl || document.activeElement;
    savedScroll = window.scrollY;
    title.innerHTML = t;
    body.innerHTML = html;
    if (!dlg.open) dlg.showModal();
    body.scrollTop = 0;
    title.focus();
  }

  function close() { if (dlg.open) dlg.close(); }

  function onClosed() {
    if (Math.abs(window.scrollY - savedScroll) > 1) window.scrollTo({ top: savedScroll, behavior: 'auto' });
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    opener = null;
    Cosmo.scroll.afterDialog();
  }

  function isOpen() { return !!(dlg && dlg.open); }

  /* --- содержимое --- */
  function sceneDetails(scene, openerEl) {
    var T = Cosmo.data.get().glossary;
    var html = '<p class="muted">' + esc(scene.dateLabel) + ' · ' + esc(scene.evidenceLabel) + '</p><p><strong>' + fmt(scene.lead, { terms: T }) + '</strong></p>';
    scene.detailsSections.forEach(function (sec) {
      html += '<h3>' + fmt(sec.heading) + '</h3>' + sec.paragraphs.map(function (p) { return '<p>' + fmt(p, { terms: T }) + '</p>'; }).join('');
    });
    if (scene.diagramId === 'h0-chart') html += fullChartHtml();
    if (scene.diagramId === 'distance-scale') html += '<p><button type="button" class="btn-ghost" data-fullchart>Как менялась оценка H<sub>0</sub>: полный график</button></p>';
    var d = scene.diagramId ? Cosmo.diagrams.render(scene.diagramId) : null;
    if (d && d.table) html += '<h3>Таблица к схеме</h3>' + d.table;
    if (scene.researchEventIds.length) {
      html += '<h3>События исследовательской базы</h3>' + scene.researchEventIds.map(function (eid) {
        var e = Cosmo.data.byId.events[eid];
        return e ? Cosmo.render.eventCard(e, false) : '';
      }).join('');
    }
    var people = scene.entityIds.map(function (id) { return Cosmo.data.byId.entities[id]; }).filter(Boolean);
    if (people.length) {
      html += '<h3>Люди и приборы</h3><div class="linklist">' + people.map(function (p) {
        return '<button type="button" class="btn-ghost" data-entity="' + esc(p.id) + '">' + esc(p.nameRu) + '</button>';
      }).join('') + '</div>';
    }
    var src = Cosmo.data.sourcesOfScene(scene);
    if (src.length) html += '<h3>Источники сцены</h3><ol class="sources-list">' + src.map(function (r) { return '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title_as_cited) + '</a> <span class="muted">' + esc(r.id) + '</span></li>'; }).join('') + '</ol>';
    open(fmt(scene.title), html, openerEl);
  }

  function fullChartHtml() {
    var c = Cosmo.diagrams.fullH0();
    return '<div data-tabs><div class="tabs" role="tablist"><button type="button" class="tab" role="tab" data-tab="zoom" aria-selected="true">H<sub>0</sub>: 60–80</button><button type="button" class="tab" role="tab" data-tab="full" aria-selected="false">H<sub>0</sub>: вся история</button><button type="button" class="tab" role="tab" data-tab="s8" aria-selected="false">S<sub>8</sub></button></div>' +
      '<div data-panel="zoom">' + c.zoom.html + c.zoom.table + '</div><div data-panel="full" hidden>' + c.full.html + c.full.table + '</div><div data-panel="s8" hidden>' + c.s8.html + '</div></div>' +
      '<p class="muted">Значения нельзя усреднять как независимые измерения: комбинации используют общие данные. Модельные значения (Planck, ACT, SPT) — не прямые измерения удаления галактик.</p>';
  }

  function fullChart(openerEl) { open('Как менялась оценка H<sub>0</sub>', fullChartHtml(), openerEl); }

  function entity(id, openerEl) {
    var e = Cosmo.data.byId.entities[id];
    if (!e) return;
    var a = e.assetId ? Cosmo.data.byId.assets[e.assetId] : null;
    var img = a ? Cosmo.render.assetImg(a.id, 'img', '') : '<span class="avatar-fallback" data-kind="' + esc(e.kind) + '" style="width:120px;height:120px;font-size:36px">' + esc(e.kind === 'person' ? U.initials(e.nameRu) : '◌') + '</span>';
    var events = e.relatedEventIds.map(function (eid) { return Cosmo.data.byId.events[eid]; }).filter(Boolean);
    var html = '<div class="entity-card" data-kind="' + esc(e.kind) + '">' + img + '<div><p class="muted">' + esc(e.nameOriginal) + '</p><p>' + fmt(e.shortDescription) + '</p>' +
      (a ? '<p class="muted">' + fmt(a.captionRu) + '. ' + Cosmo.render.credit(a) + '</p>' : '<p class="muted">Подтверждённое изображение не подобрано; показан резервный вариант.</p>') + '</div></div>';
    if (events.length) html += '<h3>Связанные события</h3>' + events.map(function (ev) {
      var sid = Cosmo.data.byId.sceneOfEvent[ev.id];
      return '<p><span class="muted">' + esc(ev.date_label) + '</span> — ' + fmt(ev.title) + (sid ? ' · <a href="#scene=' + esc(sid) + '" data-goto="' + esc(sid) + '">к сцене</a>' : ' · <a href="#event-' + esc(ev.id) + '">в хронологии</a>') + '</p>';
    }).join('');
    open(esc(e.nameRu), html, openerEl);
  }

  function asset(id, openerEl) {
    var a = Cosmo.data.byId.assets[id];
    if (!a) return;
    var html = '<figure>' + Cosmo.render.assetImg(a.id, 'img', '') + '<figcaption class="caption">' + fmt(a.captionRu) + ' ' + Cosmo.render.credit(a) + '</figcaption></figure>';
    open(esc(a.subject), html, openerEl);
  }

  function term(id, openerEl) {
    var g = Cosmo.data.byId.glossary[id];
    if (!g) return;
    var src = g.sourceIds.map(function (s) { var r = Cosmo.data.byId.sources[s]; return r ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title_as_cited) + '</a>' : ''; }).filter(Boolean).join(' · ');
    open(fmt(g.term), '<p>' + fmt(g.definition) + '</p>' + (src ? '<p class="muted">Источники: ' + src + '</p>' : '') + '<p><a href="#glossary">Весь словарь</a></p>', openerEl);
  }

  function chapters(openerEl) {
    open('Главы', Cosmo.render.chaptersSection(Cosmo.data.get().chapters) + '<p><a href="#chronology">Полная хронология: все 43 события</a></p>', openerEl);
  }

  return { init: init, open: open, close: close, isOpen: isOpen, sceneDetails: sceneDetails, entity: entity, asset: asset, term: term, chapters: chapters, fullChart: fullChart };
})();
