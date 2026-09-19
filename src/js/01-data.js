/* Данные: загрузка встроенного JSON и адаптер над исследовательской базой */
Cosmo.data = (function () {
  var D = null, A = null;
  var byId = {};

  function parse(id) {
    var node = document.getElementById(id);
    return node ? JSON.parse(node.textContent) : null;
  }

  function index(list, key) {
    var m = {};
    (list || []).forEach(function (x) { m[x[key || 'id']] = x; });
    return m;
  }

  function load() {
    D = parse('site-data');
    A = parse('site-assets') || {};
    if (!D) throw new Error('site-data не найден');
    byId.scenes = index(D.scenes);
    byId.entities = index(D.entities);
    byId.assets = index(D.assets);
    byId.chapters = index(D.chapters);
    byId.glossary = index(D.glossary);
    byId.events = index(D.research.timeline);
    byId.sources = index(D.research.sources);
    byId.h0 = index(D.research.hubble_measurements);
    // сцена, в которой событие получило экран
    byId.sceneOfEvent = {};
    D.scenes.forEach(function (s) {
      s.researchEventIds.forEach(function (eid) {
        if (!byId.sceneOfEvent[eid]) byId.sceneOfEvent[eid] = s.id;
      });
    });
    return D;
  }

  function assetUri(id, which) {
    var a = A[id];
    return a ? a[which || 'img'] : null;
  }

  /* Классификация методов H₀ для формы и цвета точек. Цвет всегда сопровождается формой и подписью. */
  var METHOD_GROUP = {
    historical_redshift_distance: 'historical', historical_distance_ladder: 'historical',
    distance_ladder: 'local', TRGB_distance_ladder: 'local', distance_ladder_combined: 'local',
    distance_network: 'local', megamaser: 'local', standard_siren: 'local',
    CMB: 'early', CMB_combined: 'early', CMB_BAO_combined: 'early',
    Lyman_alpha_AP_BAO: 'lss'
  };
  var GROUP_LABEL = {
    historical: 'Историческая приблизительная оценка', local: 'Локальные методы (лестница, мазеры, сирены)',
    early: 'Реликтовое излучение и комбинации', lss: 'Крупномасштабная структура (BAO, Lyα)'
  };
  var METHOD_LABEL = {
    historical_redshift_distance: 'Красные смещения и расстояния 1920-х', historical_distance_ladder: 'Ранняя лестница расстояний',
    distance_ladder: 'Лестница расстояний (цефеиды → SN Ia)', TRGB_distance_ladder: 'Лестница расстояний (TRGB → SN Ia)',
    distance_ladder_combined: 'Лестница расстояний (цефеиды + TRGB)', distance_network: 'Сеть локальных методов',
    megamaser: 'Мазерные диски', standard_siren: 'Стандартная сирена (гравитационные волны)',
    CMB: 'Реликтовое излучение', CMB_combined: 'Комбинация CMB-экспериментов', CMB_BAO_combined: 'CMB + линзирование + BAO',
    Lyman_alpha_AP_BAO: 'Lyα-лес + BAO'
  };
  /* Коррелирующие записи: не независимые измерения */
  var CORRELATED = [['H01', 'H02'], ['H13', 'H14', 'H15'], ['H17', 'H19']];

  function h0Points() {
    return D.research.hubble_measurements.map(function (h) {
      var grp = METHOD_GROUP[h.method] || 'local';
      var corr = CORRELATED.filter(function (c) { return c.indexOf(h.id) >= 0; })[0] || null;
      return {
        id: h.id, year: h.year, label: h.label, value: h.value,
        lo: h.error_minus, hi: h.error_plus, hasError: h.error_minus != null && h.error_plus != null,
        method: h.method, methodLabel: METHOD_LABEL[h.method] || h.method, group: grp, groupLabel: GROUP_LABEL[grp],
        model: h.model_or_calibration, version: h.version, note: h.note, uncertainty: h.uncertainty,
        sourceIds: h.source_ids, correlated: corr
      };
    }).sort(function (a, b) { return a.year - b.year || a.id.localeCompare(b.id); });
  }

  function s8Points() {
    return D.research.parameter_measurements.filter(function (p) { return p.parameter === 'S8'; }).map(function (p) {
      return { year: p.year, value: p.value, lo: p.error_minus, hi: p.error_plus, dataset: p.dataset, model: p.model, sourceIds: p.source_ids };
    });
  }

  function param(name, dataset) {
    return D.research.parameter_measurements.filter(function (p) {
      return p.parameter === name && (!dataset || (p.dataset || '').indexOf(dataset) >= 0);
    })[0] || null;
  }

  function eventsSorted() {
    return D.research.timeline.slice().sort(function (a, b) {
      return a.year_start - b.year_start || a.year_end - b.year_end || a.id.localeCompare(b.id);
    });
  }

  function sourcesOfScene(scene) {
    var ids = [];
    scene.researchEventIds.forEach(function (eid) {
      var e = byId.events[eid];
      if (e) e.source_ids.forEach(function (s) { if (ids.indexOf(s) < 0) ids.push(s); });
    });
    scene.sourceIds.forEach(function (s) { if (ids.indexOf(s) < 0) ids.push(s); });
    return ids.map(function (s) { return byId.sources[s]; }).filter(Boolean);
  }

  return { load: load, get: function () { return D; }, byId: byId, assetUri: assetUri, h0Points: h0Points,
    s8Points: s8Points, param: param, eventsSorted: eventsSorted, sourcesOfScene: sourcesOfScene,
    METHOD_LABEL: METHOD_LABEL, GROUP_LABEL: GROUP_LABEL };
})();
