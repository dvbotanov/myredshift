/* Рендер сцен, нижней шкалы и разделов под экспозицией */
Cosmo.render = (function () {
  var U = Cosmo.util, esc = U.esc, fmt = U.fmt, el = U.el;
  var BADGE = { 'Идея': ['badge-idea', '◇'], 'Измерение': ['badge-measure', '●'], 'Пересмотр': ['badge-revision', '▲'], 'Открытый вопрос': ['badge-open', '?'], 'Пролог': ['badge-prologue', '✦'] };

  function terms() { return Cosmo.data.get().glossary; }

  function badge(label) {
    var b = BADGE[label] || ['', '·'];
    return '<span class="badge ' + b[0] + '"><span class="glyph" aria-hidden="true">' + b[1] + '</span>' + esc(label) + '</span>';
  }

  function assetImg(id, which, cls, extra) {
    var a = Cosmo.data.byId.assets[id];
    var uri = Cosmo.data.assetUri(id, which);
    if (!a || !uri) return '';
    var size = which === 'thumb' ? ' width="240" height="240"' : ' width="' + a.width + '" height="' + a.height + '"';
    var loading = /loading=/.test(extra || '') ? '' : ' loading="lazy"';
    return '<img class="' + cls + '" src="' + uri + '" alt="' + esc(a.altRu) + '"' + size + loading + ' decoding="async" style="object-position:' + (a.focalPoint.x * 100) + '% ' + (a.focalPoint.y * 100) + '%"' + (extra || '') + '>';
  }

  function credit(a) {
    return '<span class="credit">' + esc(a.creator) + ' · ' + esc(a.licenseLabel) + ' · <a href="' + esc(a.sourcePageUrl) + '" target="_blank" rel="noopener">источник</a></span>';
  }

  function hero(scene) {
    if (scene.heroAssetId === 'prologue-sky') {
      var t = document.getElementById('prologue-svg');
      return '<figure class="hero hero-svg" data-kind="illustration">' + (t ? t.innerHTML : '') +
        '<figcaption class="caption">Художественная реконструкция: человек у входа в пещеру под ночным небом. Авторская иллюстрация, не фотография археологического объекта.</figcaption></figure>';
    }
    var a = Cosmo.data.byId.assets[scene.heroAssetId];
    if (!a) return '';
    var img = assetImg(a.id, 'img', 'hero-img', ' loading="' + (scene.order <= 2 ? 'eager' : 'lazy') + '"' + (scene.order === 1 ? ' fetchpriority="high"' : ''));
    return '<figure class="hero" data-kind="' + esc(a.kind) + '">' + img + '<figcaption class="caption">' + fmt(a.captionRu) + credit(a) + '</figcaption></figure>';
  }

  function miniEntity(ent) {
    var a = ent.assetId ? Cosmo.data.byId.assets[ent.assetId] : null;
    var img = a ? assetImg(a.id, 'thumb', '') : '<span class="avatar-fallback" data-kind="' + esc(ent.kind) + '" aria-hidden="true">' + esc(ent.kind === 'person' ? U.initials(ent.nameRu) : '◌') + '</span>';
    var sub = ent.kind === 'person' ? esc(ent.nameOriginal) : esc({ instrument: 'прибор', mission: 'миссия', experiment: 'эксперимент' }[ent.kind] || '');
    return '<button type="button" class="mini" data-kind="' + esc(ent.kind) + '" data-entity="' + esc(ent.id) + '" aria-label="' + esc(ent.nameRu) + ', открыть карточку">' + img +
      '<span><span class="mini-name">' + esc(ent.nameRu) + '</span><br><span class="mini-sub">' + sub + (a ? '' : ' · изображение не подобрано') + '</span></span></button>';
  }

  function miniAsset(a) {
    return '<button type="button" class="mini" data-kind="' + esc(a.kind) + '" data-asset="' + esc(a.id) + '" aria-label="' + esc(a.subject) + ', открыть изображение">' + assetImg(a.id, 'thumb', '') +
      '<span><span class="mini-name">' + esc(a.subject) + '</span><br><span class="mini-sub">' + esc({ portrait: 'портрет', instrument: 'прибор', archive: 'архив', diagram: 'данные', illustration: 'иллюстрация' }[a.kind] || '') + '</span></span></button>';
  }

  function secondary(scene) {
    if (!scene.secondaryAssetIds.length) return '';
    var items = scene.secondaryAssetIds.map(function (id) {
      var ent = Cosmo.data.get().entities.filter(function (e) { return e.assetId === id; })[0];
      var a = Cosmo.data.byId.assets[id];
      if (ent && scene.entityIds.indexOf(ent.id) >= 0) return miniEntity(ent);
      return a ? miniAsset(a) : '';
    });
    // сущности без изображения, упомянутые в сцене (резервный вариант)
    scene.entityIds.forEach(function (eid) {
      var ent = Cosmo.data.byId.entities[eid];
      if (ent && !ent.assetId && ent.kind === 'person') items.push(miniEntity(ent));
    });
    return '<div class="secondary">' + items.join('') + '</div>';
  }

  function diagram(scene) {
    if (!scene.diagramId) return '';
    var d = Cosmo.diagrams.render(scene.diagramId);
    if (!d) return '';
    var extra = scene.diagramId === 'h0-chart' ? '<p class="actions"><button type="button" class="btn-ghost" data-fullchart>Полный график H<sub>0</sub> и S<sub>8</sub></button></p>' : '';
    return '<div class="diagram" data-diagram="' + esc(scene.diagramId) + '">' + d.html + (d.alt ? '<p class="sr-only">' + esc(d.alt) + '</p>' : '') + extra + '</div>';
  }

  function factCard(f) {
    if (!f) return '';
    return '<div class="fact"><span class="fact-label">' + fmt(f.label) + '</span><span class="fact-value">' + fmt(f.value) + '</span><span class="fact-note">' + fmt(f.note) + '</span></div>';
  }

  function scene(s, i) {
    var a = Cosmo.data.byId.assets[s.heroAssetId];
    var kind = s.heroAssetId === 'prologue-sky' ? 'illustration' : (a ? a.kind : 'diagram');
    var T = terms();
    var body = s.paragraphs.map(function (p) { return '<p class="body">' + fmt(p, { terms: T }) + '</p>'; }).join('');
    var actions = s.order === 1
      ? '<div class="actions"><button type="button" class="btn" data-goto="measuring-light">Начать</button><button type="button" class="btn-ghost" data-view-reading>Читать без анимации</button></div><p class="caption">Прокручивайте вниз — путешествуйте вправо.</p>'
      : '<div class="actions"><button type="button" class="btn" data-details="' + esc(s.id) + '">Подробнее</button><a class="btn-ghost" href="#src-' + esc(s.id) + '">Источники</a></div>';
    var html = '<div class="scene-inner"><div class="scene-text">' +
      '<p class="eyebrow"><span class="date">' + esc(s.dateLabel) + '</span>' + badge(s.evidenceLabel) + '</p>' +
      '<h2 class="scene-title" id="scene-title-' + esc(s.id) + '">' + fmt(s.title) + '</h2>' +
      '<p class="lead">' + fmt(s.lead, { terms: T }) + '</p>' + body +
      '<p class="change"><strong>Что изменилось.</strong> ' + fmt(s.changeSummary) + '</p>' +
      actions +
      '</div><div class="scene-media">' + hero(s) + secondary(s) + diagram(s) + factCard(s.fact) + '</div></div>';
    var art = el('article', { class: 'scene', id: 'scene-' + s.id, 'aria-labelledby': 'scene-title-' + s.id, dataset: { index: i, sceneId: s.id, kind: kind } }, html);
    return art;
  }

  function track(scenes) {
    var frag = document.createDocumentFragment();
    scenes.forEach(function (s, i) { frag.appendChild(scene(s, i)); });
    return frag;
  }

  /* --- Нижняя шкала: локальная лента --- */
  var ICON = { sky: '✦', star: '★', thermo: '🌡', table: '▤', question: '?' };

  function ribbon(scenes, W) {
    var G = Cosmo.geometry;
    var out = '<div class="ribbon-line" style="width:' + (scenes.length * W) + 'px"></div>';
    scenes.forEach(function (s, i) {
      var m = s.markers.length;
      s.markers.forEach(function (mk, j) {
        var x = G.markerX(i, j, m, W);
        var ent = mk.entityId ? Cosmo.data.byId.entities[mk.entityId] : null;
        var kind = ent ? ent.kind : 'icon';
        var img;
        if (ent && ent.assetId && Cosmo.data.assetUri(ent.assetId, 'thumb')) img = assetImg(ent.assetId, 'thumb', 'marker-img');
        else if (ent) img = '<span class="marker-glyph" aria-hidden="true">' + esc(ent.kind === 'person' ? U.initials(ent.nameRu) : '◌') + '</span>';
        else img = '<span class="marker-glyph" aria-hidden="true">' + (ICON[mk.icon] || '·') + '</span>';
        var name = ent ? ent.nameRu : (mk.icon === 'sky' ? '' : s.title);
        var aria = (ent ? ent.nameRu + ', ' : '') + mk.label + ' — перейти к сцене «' + s.title + '»' + (ent ? '; повторное нажатие открывает карточку' : '');
        out += '<button type="button" class="marker" data-kind="' + esc(kind) + '" data-scene="' + esc(s.id) + '" data-scene-index="' + i + '"' + (ent ? ' data-entity="' + esc(ent.id) + '"' : '') +
          ' style="left:' + x.toFixed(1) + 'px" title="' + esc(aria) + '" aria-label="' + esc(aria) + '">' + img +
          '<span class="marker-year">' + esc(mk.label) + '</span><span class="marker-name">' + esc(name) + '</span></button>';
      });
      // разрывы между эпохами
      var next = scenes[i + 1];
      if (next) {
        var gapLabel = null;
        if (s.yearEnd == null) gapLabel = 'От наблюдений к измерениям';
        else if (next.yearStart - s.yearEnd > 8) gapLabel = 'переход эпох · ' + (next.yearStart - s.yearEnd) + ' лет';
        if (gapLabel) out += '<span class="marker-gap" style="left:' + ((i + 1) * W).toFixed(1) + 'px" aria-hidden="true">' + esc(gapLabel) + '</span>';
      }
    });
    return out;
  }

  function overview(chapters) {
    return chapters.map(function (c) {
      return '<button type="button" class="chapter-btn" data-chapter="' + esc(c.id) + '" data-goto="' + esc(c.sceneIds[0]) + '" title="' + esc(c.subtitle) + '">' + esc(c.title) + '</button>';
    }).join('') + '<div class="progress" aria-hidden="true"><div class="progress-fill" id="progress-fill"></div></div>';
  }

  /* --- Разделы под экспозицией --- */
  function chaptersSection(chapters) {
    return chapters.map(function (c) {
      var items = c.sceneIds.map(function (sid) {
        var s = Cosmo.data.byId.scenes[sid];
        return '<li><a href="#scene=' + esc(sid) + '" data-goto="' + esc(sid) + '"><span class="cl-date">' + esc(s.dateLabel) + '</span><span class="cl-title">' + fmt(s.title) + '</span></a></li>';
      }).join('');
      return '<div class="chapter-block"><h3>' + esc(c.title) + '</h3><p class="chapter-sub">' + esc(c.subtitle) + '</p><ol>' + items + '</ol></div>';
    }).join('');
  }

  function eventCard(e, withScene) {
    var src = e.source_ids.map(function (s) { var r = Cosmo.data.byId.sources[s]; return r ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title_as_cited) + '</a>' : ''; }).filter(Boolean).join(' · ');
    var sceneId = Cosmo.data.byId.sceneOfEvent[e.id];
    var status = e.status === 'active_research' ? 'активное исследование' : 'исторический факт';
    return '<div class="event-card" data-status="' + esc(e.status) + '"><span class="ev-date">' + esc(e.date_label) + ' · ' + esc(e.id) + ' · ' + status + '</span><h4>' + fmt(e.title) + '</h4><p>' + fmt(e.body_ru) + '</p>' +
      '<p class="event-meta"><span>Источники: ' + src + '</span>' + (withScene && sceneId ? '<a href="#scene=' + esc(sceneId) + '" data-goto="' + esc(sceneId) + '">Сцена: ' + esc(Cosmo.data.byId.scenes[sceneId].title) + '</a>' : '') + '</p></div>';
  }

  function chronology() {
    return Cosmo.data.eventsSorted().map(function (e) {
      var sceneId = Cosmo.data.byId.sceneOfEvent[e.id];
      return '<details class="event" id="event-' + esc(e.id) + '"><summary><span class="ev-date">' + esc(e.date_label) + '</span><span class="ev-title">' + fmt(e.title) + '</span><span class="ev-status">' + (e.status === 'active_research' ? 'исследуется' : esc(e.id)) + '</span></summary>' +
        '<div class="event-body">' + eventCard(e, true).replace(/<h4>.*?<\/h4>/, '') + (sceneId ? '' : '<p class="event-meta"><span>Отдельной сцены нет; событие раскрывается здесь и в «Подробнее» соседних сцен.</span></p>') + '</div></details>';
    }).join('');
  }

  function glossary(items) {
    return items.map(function (g) {
      var src = g.sourceIds.map(function (s) { var r = Cosmo.data.byId.sources[s]; return r ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title_as_cited) + '</a>' : ''; }).filter(Boolean).join(' · ');
      return '<dt id="term-' + esc(g.id) + '">' + fmt(g.term) + (g.aliases.length ? ' <span class="muted" style="font-family:var(--sans);font-size:14px;color:var(--muted)">' + esc(g.aliases.join(', ')) + '</span>' : '') + '</dt><dd>' + fmt(g.definition) + (src ? ' <span class="src">Источники: ' + src + '</span>' : '') + '</dd>';
    }).join('');
  }

  function sourcesByScene(scenes) {
    return scenes.map(function (s) {
      var list = Cosmo.data.sourcesOfScene(s);
      if (!list.length) return '';
      return '<div class="src-scene" id="src-' + esc(s.id) + '"><span class="cl-date">' + esc(s.dateLabel) + '</span><div><strong>' + fmt(s.title) + '</strong><ul>' + list.map(function (r) {
        return '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title_as_cited) + '</a> <span class="muted" style="color:var(--muted)">' + esc(r.id) + '</span></li>';
      }).join('') + '</ul></div></div>';
    }).join('');
  }

  function imageCredits(assets) {
    return '<div class="credits">' + assets.map(function (a) {
      return '<div class="credit">' + assetImg(a.id, 'thumb', '') + '<div><strong>' + esc(a.subject) + '</strong> — ' + esc(a.captionRu) + '<br><span class="muted">' + esc(a.creator) + ' · ' + esc(a.licenseLabel) + (a.licenseUrl ? ' (<a href="' + esc(a.licenseUrl) + '" target="_blank" rel="noopener">условия</a>)' : '') + ' · <a href="' + esc(a.sourcePageUrl) + '" target="_blank" rel="noopener">страница файла</a>' + (a.rightsStatus !== 'verified' ? ' · права не подтверждены' : '') + '</span></div></div>';
    }).join('') + '</div>';
  }

  function sourcesList(sources) {
    return sources.map(function (r) {
      return '<li id="source-' + esc(r.id) + '"><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title_as_cited) + '</a> <span style="color:var(--muted)">' + esc(r.id) + ' · проверено ' + esc(r.accessed) + '</span></li>';
    }).join('');
  }

  return { scene: scene, track: track, ribbon: ribbon, overview: overview, chaptersSection: chaptersSection, chronology: chronology,
    glossary: glossary, sourcesByScene: sourcesByScene, imageCredits: imageCredits, sourcesList: sourcesList, eventCard: eventCard, assetImg: assetImg, credit: credit };
})();
