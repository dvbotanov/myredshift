/* Инфографика: SVG-схемы. Каждая возвращает { html, alt, table? }.
   Цвета берутся из CSS-переменных; различие всегда дублируется формой или подписью. */
Cosmo.diagrams = (function () {
  var U = Cosmo.util;
  var esc = U.esc, num = U.num;

  function svg(w, h, inner, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '" font-family="IBM Plex Sans, system-ui, sans-serif" font-size="13" fill="var(--text)">' + inner + '</svg>';
  }
  function txt(x, y, s, attrs) { return '<text x="' + x + '" y="' + y + '" ' + (attrs || '') + '>' + esc(s) + '</text>'; }
  function axis(x1, y1, x2, y2) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="var(--line-strong)" stroke-width="1"/>'; }
  function path(d, stroke, extra) { return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" ' + (extra || '') + '/>'; }
  function wrap(html, caption, alt) {
    return '<div class="diagram-inner">' + html + (caption ? '<p class="diagram-caption">' + caption + '</p>' : '') + '</div>';
  }

  /* --- Пульсация цефеиды и связь период–светимость --- */
  function cepheid() {
    var pts = [];
    for (var i = 0; i <= 200; i++) {
      var t = i / 200 * 2;                    // два периода
      var ph = t % 1;
      var v = ph < 0.25 ? ph / 0.25 : 1 - (ph - 0.25) / 0.75;   // быстрый рост, медленный спад
      pts.push((40 + i * 1.4).toFixed(1) + ',' + (150 - v * 80).toFixed(1));
    }
    var curve = 'M' + pts.join(' L');
    var g = '<g>' + txt(40, 30, 'Блеск одной цефеиды во времени', 'font-size="14" font-weight="600"') +
      axis(40, 160, 330, 160) + axis(40, 60, 40, 160) + path(curve, 'var(--obs)') +
      txt(50, 182, 'время →', 'fill="var(--muted)"') + txt(120, 96, 'период', 'fill="var(--accent)"') +
      '<line x1="60" y1="102" x2="196" y2="102" stroke="var(--accent)" stroke-dasharray="3 3"/>' +
      '</g>';
    var pl = '<g>' + txt(380, 30, 'Чем дольше период, тем ярче', 'font-size="14" font-weight="600"') +
      axis(380, 160, 620, 160) + axis(380, 60, 380, 160) +
      path('M400 140 L600 75', 'var(--accent)') +
      [[420, 132], [455, 122], [490, 110], [530, 96], [570, 84]].map(function (p) {
        return '<circle cx="' + p[0] + '" cy="' + (p[1] + (p[0] % 3 - 1) * 4) + '" r="4" fill="var(--obs)"/>';
      }).join('') +
      txt(390, 182, 'период (лог.) →', 'fill="var(--muted)"') + txt(392, 72, '↑ светимость', 'fill="var(--muted)"') +
      '</g>';
    return { html: wrap(svg(640, 200, g + pl, 'Схема: кривая блеска цефеиды с отмеченным периодом и зависимость светимости от периода'),
      'Схема принципа. Ливитт сравнивала видимую яркость 25 цефеид, находящихся примерно на одном расстоянии.'),
      alt: 'Слева кривая блеска: быстрый подъём и медленный спад, повторяющийся с периодом. Справа: точки ложатся на растущую прямую — светимость растёт с периодом.' };
  }

  /* --- Три состояния масштаба a(t) --- */
  function scaleFactor() {
    var g = axis(60, 170, 600, 170) + axis(60, 30, 60, 170) +
      txt(70, 190, 'время →', 'fill="var(--muted)"') + txt(66, 44, '↑ масштаб a(t)', 'fill="var(--muted)"') +
      path('M80 110 L580 110', 'var(--theory)', 'stroke-dasharray="6 5"') + txt(430, 100, 'статическая (Эйнштейн, 1917)', 'fill="var(--theory)"') +
      path('M80 150 C 250 140, 420 100, 580 40', 'var(--obs)') + txt(400, 46, 'расширение', 'fill="var(--obs)"') +
      path('M80 70 C 250 80, 420 120, 580 165', 'var(--muted)') + txt(430, 150, 'сжатие', 'fill="var(--muted)"');
    return { html: wrap(svg(640, 200, g, 'Три возможных поведения масштабного фактора: постоянный, растущий, убывающий'),
      'Фридман показал: уравнения допускают растущий или убывающий масштаб. Схема, не измерение.'),
      alt: 'Три кривые масштабного фактора от времени: горизонтальная пунктирная — статическая модель; растущая — расширение; убывающая — сжатие.' };
  }

  /* --- Диаграмма скорость–расстояние --- */
  function vd() {
    var pts = [[90, 165], [130, 150], [160, 158], [200, 135], [240, 128], [270, 138], [310, 112], [350, 104], [390, 116], [430, 90], [470, 78], [520, 72], [560, 58]];
    var g = axis(60, 180, 600, 180) + axis(60, 30, 60, 180) +
      txt(70, 198, 'расстояние →', 'fill="var(--muted)"') + txt(66, 44, '↑ скорость удаления', 'fill="var(--muted)"') +
      path('M70 175 L590 50', 'var(--accent)') +
      pts.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="var(--obs)"/>'; }).join('') +
      txt(380, 60, 'v ≈ H₀ · D', 'fill="var(--accent)" font-size="16"');
    return { html: wrap(svg(640, 210, g.replace('H₀', 'H<tspan baseline-shift="sub" font-size="11">0</tspan>'), 'Схема закона Хаббла—Леметра: скорость удаления растёт с расстоянием'),
      'Схема принципа, а не данные 1929 года: в среднем скорость удаления пропорциональна расстоянию. Коэффициент — H₀.'),
      alt: 'Точки разбросаны вокруг растущей прямой: чем больше расстояние, тем больше скорость удаления.' };
  }

  /* --- Три геометрии (инфографика B) --- */
  function geometries() {
    var ok = Cosmo.data.param('Omega_k');
    var panel = function (x, title, shape, sum, note) {
      return '<g transform="translate(' + x + ',0)">' + txt(0, 22, title, 'font-size="14" font-weight="600"') + shape +
        txt(0, 168, sum, 'fill="var(--muted)"') + txt(0, 186, note, 'fill="var(--muted)" font-size="12"') + '</g>';
    };
    var sphere = '<circle cx="90" cy="95" r="55" fill="none" stroke="var(--line-strong)"/>' +
      '<ellipse cx="90" cy="95" rx="55" ry="18" fill="none" stroke="var(--line)"/>' +
      path('M62 118 Q 90 40 118 118 Q 90 105 62 118 Z', 'var(--theory)');
    var plane = '<g stroke="var(--line)" fill="none">' + [50, 70, 90, 110, 130].map(function (y) { return '<line x1="35" y1="' + y + '" x2="145" y2="' + y + '"/>'; }).join('') +
      [55, 75, 95, 115, 135].map(function (x) { return '<line x1="' + x + '" y1="40" x2="' + x + '" y2="140"/>'; }).join('') + '</g>' +
      path('M62 120 L118 120 L90 52 Z', 'var(--theory)');
    var saddle = '<g fill="none" stroke="var(--line)">' +
      path('M30 60 Q 90 130 150 60', 'var(--line-strong)') + path('M30 140 Q 90 70 150 140', 'var(--line-strong)') +
      path('M60 45 Q 90 110 120 45', 'var(--line)') + path('M60 155 Q 90 90 120 155', 'var(--line)') + '</g>' +
      path('M62 122 Q 90 100 118 122 Q 100 80 90 60 Q 80 80 62 122 Z', 'var(--theory)');
    var angles = '<g transform="translate(470,0)">' + txt(0, 22, 'Что измеряют', 'font-size="14" font-weight="600"') +
      '<circle cx="20" cy="100" r="4" fill="var(--obs)"/>' +
      path('M20 100 L150 62', 'var(--obs)') + path('M20 100 L150 138', 'var(--obs)') +
      '<line x1="150" y1="62" x2="150" y2="138" stroke="var(--accent)" stroke-width="3"/>' +
      txt(0, 168, 'известный физический размер', 'fill="var(--muted)" font-size="12"') +
      txt(0, 186, 'виден под углом, зависящим от кривизны', 'fill="var(--muted)" font-size="12"') + '</g>';
    var g = panel(20, 'Положительная', sphere, 'Сумма углов > 180°', 'Ωₖ < 0') +
      panel(170, 'Нулевая (плоская)', plane, 'Сумма углов = 180°', 'Ωₖ = 0') +
      panel(320, 'Отрицательная', saddle, 'Сумма углов < 180°', 'Ωₖ > 0') + angles;
    g = g.replace(/Ωₖ/g, 'Ω<tspan baseline-shift="sub" font-size="10">k</tspan>');
    var val = ok ? 'Ω<sub>k</sub> = ' + num(ok.value) + ' ± ' + num(ok.error_plus) + ' (Planck 2018 + BAO, 68%)' : '';
    return { html: wrap(svg(640, 200, g, 'Три двумерные аналогии кривизны: сфера, плоскость, седло; справа — как кривизна меняет видимый угол известного размера'),
      'Двумерные аналогии: реальное пространство трёхмерно. Близость к плоскости не доказывает бесконечности. ' + val),
      alt: 'Три панели: сфера с треугольником, сумма углов больше 180°; плоскость с сеткой, ровно 180°; седло, меньше 180°. Четвёртая панель: известный размер виден под углом, который зависит от кривизны. ' + val.replace(/<[^>]+>/g, '') };
  }

  /* --- Горячее прошлое или стационарная Вселенная --- */
  function hotVsSteady() {
    var dots = function (x0, y0, n, spread) {
      var s = '';
      for (var i = 0; i < n; i++) {
        var a = i * 2.399, r = spread * Math.sqrt((i + 1) / n);
        s += '<circle cx="' + (x0 + r * Math.cos(a)).toFixed(1) + '" cy="' + (y0 + r * Math.sin(a)).toFixed(1) + '" r="2.2" fill="var(--text)"/>';
      }
      return s;
    };
    var hot = txt(20, 22, 'Горячее прошлое (1948)', 'font-size="14" font-weight="600" fill="var(--obs)"') +
      '<circle cx="70" cy="95" r="22" fill="var(--accent)" opacity="0.6"/>' + dots(70, 95, 14, 16) +
      '<circle cx="165" cy="95" r="40" fill="var(--accent)" opacity="0.25"/>' + dots(165, 95, 14, 32) +
      '<circle cx="275" cy="95" r="58" fill="var(--accent)" opacity="0.08"/>' + dots(275, 95, 14, 50) +
      txt(20, 172, 'плотность и температура падают → остаточное', 'fill="var(--muted)" font-size="12"') +
      txt(20, 188, 'излучение ≈ 5 K (предсказание Альфера и Германа)', 'fill="var(--muted)" font-size="12"');
    var steady = '<g transform="translate(340,0)">' + txt(20, 22, 'Стационарная (1948–1949)', 'font-size="14" font-weight="600" fill="var(--theory)"') +
      '<circle cx="70" cy="95" r="22" fill="none" stroke="var(--line-strong)"/>' + dots(70, 95, 10, 16) +
      '<circle cx="165" cy="95" r="40" fill="none" stroke="var(--line-strong)"/>' + dots(165, 95, 24, 32) +
      '<circle cx="275" cy="95" r="58" fill="none" stroke="var(--line-strong)"/>' + dots(275, 95, 50, 50) +
      txt(20, 172, 'объём растёт, но рождается новое вещество:', 'fill="var(--muted)" font-size="12"') +
      txt(20, 188, 'средняя плотность постоянна, фона нет', 'fill="var(--muted)" font-size="12"') + '</g>';
    return { html: wrap(svg(640, 200, hot + steady, 'Две схемы расширения: остывающая горячая Вселенная и стационарная с рождением вещества'), 'Две картины 1948–1949 годов и их проверяемые следствия. Схема.'),
      alt: 'Слева три растущих круга с одинаковым числом точек и угасающим свечением: плотность и температура падают. Справа круги растут, а точек становится больше: плотность постоянна.' };
  }

  /* --- Пересмотр шкалы расстояний --- */
  function distanceScale() {
    var rows = [['1929', 'Хаббл', 500, '≈ 2 млрд лет'], ['1952', 'Бааде: расстояния вырастают, H₀ — примерно вдвое меньше', null, ''], ['1958', 'Сэндидж', 75, '≈ 13 млрд лет']];
    var g = txt(20, 22, 'Оценка H₀, км/с/Мпк', 'font-size="14" font-weight="600"') + txt(470, 22, 'Хаббловское время 1/H₀', 'font-size="14" font-weight="600"');
    var y = 55;
    rows.forEach(function (r) {
      g += txt(20, y + 5, r[0], 'fill="var(--accent)"');
      if (r[2]) {
        var w = r[2] / 500 * 300;
        g += '<rect x="70" y="' + (y - 9) + '" width="' + w + '" height="18" fill="var(--obs)" opacity="0.7" rx="2"/>' +
          txt(78 + w, y + 5, '≈ ' + r[2] + ' · ' + r[1], '') + txt(470, y + 5, r[3], 'fill="var(--muted)"');
      } else {
        g += txt(70, y + 5, r[1], 'fill="var(--muted)" font-size="12"');
      }
      y += 44;
    });
    g = g.replace(/H₀/g, 'H<tspan baseline-shift="sub" font-size="10">0</tspan>');
    return { html: wrap(svg(640, 190, g, 'Исторические оценки H₀ 1929–1958 и соответствующее хаббловское время'),
      'Исторические приблизительные оценки без восстановленных погрешностей; версии одного пересмотра — не независимые измерения. 1/H₀ — арифметическая иллюстрация, а не измерение возраста.'),
      alt: 'Полоса 1929 года: около 500 км/с/Мпк, хаббловское время около 2 млрд лет. 1952: Бааде удваивает расстояния. 1958: около 75, хаббловское время около 13 млрд лет.',
      table: '<table class="data"><tr><th>Год</th><th>Оценка</th><th>H<sub>0</sub></th><th>1/H<sub>0</sub></th></tr><tr><td>1929</td><td>Хаббл</td><td>≈ 500</td><td>≈ 2 млрд лет</td></tr><tr><td>1952</td><td>Бааде, пересмотр</td><td>≈ вдвое меньше</td><td>—</td></tr><tr><td>1958</td><td>Сэндидж</td><td>≈ 75</td><td>≈ 13 млрд лет</td></tr></table>' };
  }

  /* --- Кривая вращения --- */
  function rotationCurve() {
    var kep = 'M120 60', obs = 'M120 60';
    for (var i = 1; i <= 46; i++) {
      var x = 120 + i * 10, r = i / 46;
      kep += ' L' + x + ' ' + (170 - 110 / Math.sqrt(1 + r * 6)).toFixed(1);
      obs += ' L' + x + ' ' + (170 - 100 * (1 - Math.exp(-r * 5)) - 6).toFixed(1);
    }
    var g = axis(60, 170, 600, 170) + axis(60, 30, 60, 170) + txt(70, 190, 'расстояние от центра →', 'fill="var(--muted)"') + txt(66, 44, '↑ скорость вращения', 'fill="var(--muted)"') +
      path('M60 170 C 90 120, 105 80, 120 60', 'var(--line-strong)') +
      path(kep, 'var(--theory)', 'stroke-dasharray="6 5"') + txt(400, 150, 'ожидание по видимой массе', 'fill="var(--theory)"') +
      path(obs, 'var(--obs)') + txt(400, 58, 'измеренные скорости', 'fill="var(--obs)"');
    return { html: wrap(svg(640, 200, g, 'Схема кривой вращения: ожидаемое падение скорости и измеренная почти плоская кривая'), 'Схема принципа, не данные конкретной галактики.'),
      alt: 'Две кривые: пунктирная падает с расстоянием, как ожидается для видимой массы; сплошная остаётся почти плоской, как измерено.' };
  }

  /* --- Инфляция растягивает кривизну --- */
  function inflationStretch() {
    var frame = function (x, r, label) {
      var d = 'M' + (x - 50) + ' 120 A ' + r + ' ' + r + ' 0 0 1 ' + (x + 50) + ' 120';
      return path(d, 'var(--theory)') + txt(x - 50, 150, label, 'fill="var(--muted)" font-size="12"');
    };
    var g = txt(20, 22, 'Один и тот же участок поверхности после растяжения', 'font-size="14" font-weight="600"') +
      frame(90, 55, 'заметная кривизна') + txt(165, 118, '→', 'font-size="22" fill="var(--muted)"') +
      frame(270, 130, 'кривизна меньше') + txt(345, 118, '→', 'font-size="22" fill="var(--muted)"') +
      frame(450, 900, 'почти плоско') + txt(520, 118, '→ ?', 'font-size="22" fill="var(--muted)"');
    return { html: wrap(svg(640, 170, g, 'Схема: участок сферы после многократного растяжения выглядит всё более плоским'), 'Двумерная аналогия. Теоретическое объяснение, а не наблюдение инфляционного поля.'),
      alt: 'Три дуги одинаковой ширины: заметно изогнутая, слабее изогнутая и почти прямая — тот же участок после растяжения.' };
  }

  /* --- Спектр чёрного тела ~2.725 K (форма) --- */
  function firas() {
    var pts = [];
    for (var i = 1; i <= 100; i++) {
      var nu = i / 100 * 4.2;                 // в единицах kT/h условно
      var v = nu * nu * nu / (Math.exp(nu * 1.0) - 1);   // форма Планка
      pts.push([60 + i * 5.2, 165 - v * 95]);
    }
    var curve = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L');
    var dots = pts.filter(function (p, i) { return i % 8 === 3; }).map(function (p) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" fill="var(--obs)"/>'; }).join('');
    var g = axis(60, 165, 600, 165) + axis(60, 30, 60, 165) + txt(70, 186, 'частота →', 'fill="var(--muted)"') + txt(66, 44, '↑ интенсивность', 'fill="var(--muted)"') +
      path(curve, 'var(--accent)') + dots + txt(330, 60, 'кривая чёрного тела при 2,725 K', 'fill="var(--accent)"');
    return { html: wrap(svg(640, 195, g, 'Схема спектра чёрного тела с точками измерений вдоль кривой'), 'Форма кривой Планка. Точки — иллюстрация, а не данные FIRAS.'),
      alt: 'Горбатая кривая интенсивности от частоты; точки лежат точно на кривой чёрного тела.' };
  }

  /* --- Стандартизация сверхновых --- */
  function snStandardization() {
    var lc = function (x0, peak, width, color) {
      var d = 'M' + x0 + ' 150';
      for (var i = 0; i <= 40; i++) {
        var t = i / 40 * 3 - 0.6;
        var v = t < 0 ? Math.exp(-(t * t) * 12) : Math.exp(-t / width);
        d += ' L' + (x0 + i * 5).toFixed(1) + ' ' + (150 - v * peak).toFixed(1);
      }
      return path(d, color);
    };
    var g = txt(20, 22, 'До стандартизации', 'font-size="14" font-weight="600"') + axis(30, 150, 300, 150) +
      lc(40, 100, 1.1, 'var(--obs)') + lc(40, 62, 0.55, 'var(--muted)') +
      txt(150, 62, 'ярче и медленнее', 'fill="var(--obs)" font-size="12"') + txt(150, 118, 'слабее и быстрее', 'fill="var(--muted)" font-size="12"') +
      '<g transform="translate(330,0)">' + txt(20, 22, 'После поправки по кривой блеска', 'font-size="14" font-weight="600"') + axis(30, 150, 300, 150) +
      lc(40, 100, 1.1, 'var(--obs)') + lc(40, 96, 1.0, 'var(--accent)') + txt(150, 60, 'сравнимые маяки', 'fill="var(--accent)" font-size="12"') + '</g>';
    return { html: wrap(svg(640, 170, g, 'Схема стандартизации сверхновых Ia: разные кривые блеска после поправки по скорости угасания совпадают'), 'Соотношение Филлипса: сверхновые Ia не одинаковы, их стандартизируют. Схема.'),
      alt: 'Слева две кривые блеска: высокая и широкая против низкой и узкой. Справа после поправки они почти совпадают.' };
  }

  /* --- Первый акустический пик --- */
  function cmbPeak() {
    var d = 'M60 150';
    for (var i = 1; i <= 100; i++) {
      var l = i / 100 * 1000;
      var v = Math.exp(-Math.pow((l - 200) / 90, 2)) * 1 + Math.exp(-Math.pow((l - 520) / 90, 2)) * 0.45 + Math.exp(-Math.pow((l - 800) / 100, 2)) * 0.35;
      d += ' L' + (60 + i * 5.3).toFixed(1) + ' ' + (150 - v * 105).toFixed(1);
    }
    var g = axis(60, 150, 600, 150) + axis(60, 30, 60, 150) + txt(70, 170, 'угловой масштаб: крупный ← ℓ → мелкий', 'fill="var(--muted)"') + txt(66, 44, '↑ мощность', 'fill="var(--muted)"') +
      path(d, 'var(--obs)') + '<line x1="166" y1="45" x2="166" y2="150" stroke="var(--accent)" stroke-dasharray="4 4"/>' +
      txt(176, 58, 'первый пик, ℓ ≈ 197 ± 6 (BOOMERanG, 2000)', 'fill="var(--accent)"') + txt(176, 76, 'положение зависит от геометрии', 'fill="var(--muted)" font-size="12"');
    return { html: wrap(svg(640, 180, g, 'Схема углового спектра реликтового излучения с первым акустическим пиком около ℓ равного 200'), 'Схема формы спектра; результат BOOMERanG выражен положением пика, а не «процентом плоскости».'),
      alt: 'Кривая с несколькими горбами; первый и самый высокий отмечен пунктиром при ℓ около 197.' };
  }

  /* --- BAO: линейка --- */
  function bao() {
    var rd = Cosmo.data.param('r_drag');
    var ring = function (cx, cy, r, n) {
      var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--accent)" stroke-dasharray="3 4"/>';
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2 + (r % 7) * 0.3;
        s += '<circle cx="' + (cx + r * Math.cos(a)).toFixed(1) + '" cy="' + (cy + r * Math.sin(a)).toFixed(1) + '" r="2.5" fill="var(--obs)"/>';
      }
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="var(--text)"/>';
      return s;
    };
    var g = txt(20, 22, 'Избыток пар галактик на характерном расстоянии', 'font-size="14" font-weight="600"') +
      ring(120, 105, 60, 11) + ring(330, 105, 42, 9) + ring(480, 105, 30, 8) +
      '<line x1="120" y1="105" x2="180" y2="105" stroke="var(--accent)" stroke-width="2"/>' +
      txt(60, 190, 'ближе: линейка выглядит крупнее', 'fill="var(--muted)" font-size="12"') + txt(330, 190, 'дальше: тот же масштаб виден мельче', 'fill="var(--muted)" font-size="12"');
    return { html: wrap(svg(640, 200, g, 'Схема: кольца галактик одного физического размера на разных расстояниях выглядят разными по размеру'),
      'Схема. Звуковой горизонт r<sub>d</sub>' + (rd ? ' = ' + num(rd.value) + ' ± ' + num(rd.error_plus) + ' Мпк (Planck 2018)' : '') + ' — стандартная линейка; сравнение её видимого размера на разных z даёт историю расстояний.'),
      alt: 'Три кольца из точек-галактик уменьшающегося видимого размера вокруг центральной галактики: одинаковый физический масштаб на растущих расстояниях.' };
  }

  /* --- Состав Вселенной (инфографика C) --- */
  function composition() {
    var parts = [['Тёмная энергия', 68.5, 'var(--theory)'], ['Тёмная материя', 26.6, 'var(--obs)'], ['Обычное вещество', 4.9, 'var(--accent)']];
    var r = 70, C = 2 * Math.PI * r, off = 0, arcs = '';
    parts.forEach(function (p) {
      var len = C * p[1] / 100;
      arcs += '<circle cx="110" cy="105" r="' + r + '" fill="none" stroke="' + p[2] + '" stroke-width="30" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 110 105)"/>';
      off += len;
    });
    var legend = parts.map(function (p, i) {
      return '<rect x="230" y="' + (52 + i * 34) + '" width="14" height="14" fill="' + p[2] + '"/>' + txt(252, 64 + i * 34, num(p[1]) + '% — ' + p[0], 'font-size="15"');
    }).join('');
    var g = arcs + legend + txt(230, 170, 'Средняя массово-энергетическая плотность сегодня,', 'fill="var(--muted)" font-size="12"') + txt(230, 186, 'опорная модель Planck ΛCDM. Не доли объёма.', 'fill="var(--muted)" font-size="12"');
    return { html: wrap(svg(640, 200, g, 'Кольцевая диаграмма состава: 68,5% тёмная энергия, 26,6% тёмная материя, 4,9% обычное вещество'),
      'Паспорт модели, а не три независимо видимые субстанции: значения округлены; нейтрино и излучение в точной версии учитываются отдельно.'),
      alt: 'Кольцевая диаграмма: тёмная энергия 68,5%, тёмная материя 26,6%, обычное вещество 4,9%. Средняя массово-энергетическая плотность сегодня в модели Planck ΛCDM.',
      table: '<table class="data"><tr><th>Компонент</th><th>Доля плотности</th></tr><tr><td>Тёмная энергия</td><td>68,5%</td></tr><tr><td>Тёмная материя</td><td>26,6%</td></tr><tr><td>Обычное вещество</td><td>4,9%</td></tr></table>' };
  }

  /* --- Сравнение методов 2022–2025 --- */
  function methodCompare() {
    var ids = ['H11', 'H12', 'H13', 'H14'], pts = Cosmo.data.h0Points().filter(function (p) { return ids.indexOf(p.id) >= 0; });
    return h0Chart(pts, { ymin: 66, ymax: 77, width: 640, height: 220, byIndex: true, xLabel: false,
      caption: 'Программы HST+JWST 2025 года и SH0ES 2022. Записи 3 и 4 коррелируют между собой. Ошибка CCHP объединена квадратично.' });
  }

  /* --- График H₀ (инфографика A) --- */
  var SHAPE = {
    historical: function (x, y) { return '<path d="M' + x + ' ' + (y - 6) + ' L' + (x + 6) + ' ' + y + ' L' + x + ' ' + (y + 6) + ' L' + (x - 6) + ' ' + y + ' Z" fill="var(--bg)" stroke="var(--muted)" stroke-width="1.5"/>'; },
    local: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="5.5" fill="var(--obs)"/>'; },
    early: function (x, y) { return '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="10" height="10" fill="var(--theory)"/>'; },
    lss: function (x, y) { return '<path d="M' + x + ' ' + (y - 6) + ' L' + (x + 6) + ' ' + (y + 5) + ' L' + (x - 6) + ' ' + (y + 5) + ' Z" fill="var(--accent)"/>'; }
  };

  function h0Chart(points, o) {
    o = o || {};
    var W = o.width || 640, H = o.height || 300, padL = 52, padR = 16, padT = 18, padB = 34;
    var ymin = o.ymin, ymax = o.ymax;
    var byIndex = !!o.byIndex;
    var years = points.map(function (p) { return p.year; });
    var xmin = o.xmin || Math.min.apply(null, years) - 2, xmax = o.xmax || Math.max.apply(null, years) + 2;
    var X = function (p, i) { return byIndex ? padL + (i + 0.5) / points.length * (W - padL - padR) : padL + (p.year - xmin) / (xmax - xmin) * (W - padL - padR); };
    var Y = function (v) { return padT + (ymax - v) / (ymax - ymin) * (H - padT - padB); };
    // разводим точки одного года
    var seen = {};
    var xs = points.map(function (p, i) {
      var x = X(p, i);
      if (!byIndex) { seen[p.year] = (seen[p.year] || 0) + 1; x += (seen[p.year] - 1) * 9; }
      return x;
    });
    var g = '';
    // сетка
    var step = (ymax - ymin) > 100 ? 100 : (ymax - ymin) > 20 ? 5 : 2;
    for (var v = Math.ceil(ymin / step) * step; v <= ymax; v += step) {
      g += '<line x1="' + padL + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(v).toFixed(1) + '" stroke="var(--line)"/>' + txt(padL - 8, Y(v) + 4, String(v), 'text-anchor="end" fill="var(--muted)" font-size="12"');
    }
    if (!byIndex) {
      var ystep = (xmax - xmin) > 60 ? 20 : 5;
      for (var yr = Math.ceil(xmin / ystep) * ystep; yr <= xmax; yr += ystep) {
        g += txt(X({ year: yr }), H - padB + 18, String(yr), 'text-anchor="middle" fill="var(--muted)" font-size="12"');
      }
    }
    g += txt(padL, 12, 'H₀, км/с/Мпк'.replace('H₀', 'H<tspan baseline-shift="sub" font-size="9">0</tspan>'), 'fill="var(--muted)" font-size="12"');
    // корреляционные скобки
    var brackets = {};
    points.forEach(function (p, i) { if (p.correlated) { var k = p.correlated.join(); (brackets[k] = brackets[k] || []).push(xs[i]); } });
    Object.keys(brackets).forEach(function (k) {
      var arr = brackets[k]; if (arr.length < 2) return;
      var a = Math.min.apply(null, arr) - 6, b = Math.max.apply(null, arr) + 6, y = H - padB + 4;
      g += '<path d="M' + a + ' ' + (y - 4) + ' L' + a + ' ' + y + ' L' + b + ' ' + y + ' L' + b + ' ' + (y - 4) + '" fill="none" stroke="var(--muted)" stroke-dasharray="2 2"/>';
    });
    // точки
    points.forEach(function (p, i) {
      var x = xs[i].toFixed(1), y = Y(p.value).toFixed(1);
      var inner = '';
      if (p.hasError) {
        inner += '<line x1="' + x + '" y1="' + Y(p.value + p.hi).toFixed(1) + '" x2="' + x + '" y2="' + Y(p.value - p.lo).toFixed(1) + '" stroke="' + (p.group === 'early' ? 'var(--theory)' : p.group === 'lss' ? 'var(--accent)' : 'var(--obs)') + '" stroke-width="1.5"/>';
        inner += '<line x1="' + (xs[i] - 4).toFixed(1) + '" y1="' + Y(p.value + p.hi).toFixed(1) + '" x2="' + (xs[i] + 4).toFixed(1) + '" y2="' + Y(p.value + p.hi).toFixed(1) + '" stroke="currentColor" opacity="0.6"/>';
        inner += '<line x1="' + (xs[i] - 4).toFixed(1) + '" y1="' + Y(p.value - p.lo).toFixed(1) + '" x2="' + (xs[i] + 4).toFixed(1) + '" y2="' + Y(p.value - p.lo).toFixed(1) + '" stroke="currentColor" opacity="0.6"/>';
      }
      inner += (SHAPE[p.group] || SHAPE.local)(Number(x), Number(y));
      inner += txt(Number(x) + 8, Number(y) - 8, String(i + 1), 'font-size="11" fill="var(--muted)"');
      var aria = (i + 1) + '. ' + p.label + ', ' + p.year + ': ' + num(p.value) + (p.hasError ? ' ± ' + num(p.hi) : ', историческая приблизительная оценка');
      g += '<g class="h0-point" role="button" tabindex="0" data-h0="' + p.id + '" aria-label="' + esc(aria) + '" style="cursor:pointer"><rect x="' + (xs[i] - 12).toFixed(1) + '" y="' + (Y(p.value) - 14).toFixed(1) + '" width="24" height="28" fill="transparent"/>' + inner + '</g>';
    });
    var legend = '<div class="legend">' +
      '<span><svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="var(--obs)"/></svg>локальные методы</span>' +
      '<span><svg viewBox="0 0 14 14"><rect x="2" y="2" width="10" height="10" fill="var(--theory)"/></svg>реликтовое излучение</span>' +
      '<span><svg viewBox="0 0 14 14"><path d="M7 1 L13 12 L1 12 Z" fill="var(--accent)"/></svg>BAO / Lyα</span>' +
      '<span><svg viewBox="0 0 14 14"><path d="M7 1 L13 7 L7 13 L1 7 Z" fill="none" stroke="var(--muted)" stroke-width="1.5"/></svg>историческая оценка, без погрешности</span>' +
      '<span>⌊ ⌋ коррелирующие записи</span></div>';
    var table = '<div class="table-wrap"><table class="data"><tr><th>№</th><th>Год</th><th>Исследование</th><th>H<sub>0</sub></th><th>Метод</th></tr>' + points.map(function (p, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + p.year + '</td><td>' + esc(p.label) + '</td><td>' + num(p.value) + (p.hasError ? ' ± ' + num(p.hi) : ' (≈)') + '</td><td>' + esc(p.methodLabel) + '</td></tr>';
    }).join('') + '</table></div>';
    var html = '<div class="h0-chart">' + svg(W, H, g, 'График оценок H₀ по годам: точки с интервалами неопределённости, форма отражает метод') + legend +
      (o.caption ? '<p class="diagram-caption">' + o.caption + '</p>' : '') + '<div class="chart-detail" data-h0-detail><span class="muted">Нажмите точку — значение, метод, набор данных, модель, версия и источник.</span></div></div>';
    return { html: html, alt: 'График оценок H₀ по годам; полный список в таблице.', table: table };
  }

  function h0Detail(id) {
    var p = Cosmo.data.h0Points().filter(function (q) { return q.id === id; })[0];
    if (!p) return '';
    var src = p.sourceIds.map(function (s) { var r = Cosmo.data.byId.sources[s]; return r ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title_as_cited) + '</a>' : ''; }).join(', ');
    return '<strong>' + esc(p.label) + ' (' + p.year + ')</strong>' +
      '<span>H<sub>0</sub> = ' + num(p.value) + (p.hasError ? ' <span class="muted">+' + num(p.hi) + ' / −' + num(p.lo) + '</span>' : '') + ' км/с/Мпк' + (p.hasError ? '' : ' — историческая приблизительная оценка, погрешность не реконструирована') + '</span>' +
      '<span class="muted">Метод: ' + esc(p.methodLabel) + '. Набор данных / калибровка: ' + esc(p.model || '—') + '. Версия: ' + esc(p.version || '—') + '.</span>' +
      (p.note ? '<span class="muted">' + esc(p.note) + '</span>' : '') +
      (p.correlated ? '<span class="muted">Коррелирует с: ' + p.correlated.filter(function (c) { return c !== p.id; }).map(function (c) { var q = Cosmo.data.byId.h0[c]; return q ? esc(q.label) : c; }).join('; ') + ' — не независимые измерения.</span>' : '') +
      '<span class="muted">Источник: ' + src + '</span>';
  }

  function s8Chart() {
    var pts = Cosmo.data.s8Points();
    var W = 640, H = 200, padL = 60, padR = 16, padT = 18, padB = 30, ymin = 0.74, ymax = 0.88;
    var Y = function (v) { return padT + (ymax - v) / (ymax - ymin) * (H - padT - padB); };
    var g = '';
    for (var v = 0.74; v <= 0.881; v += 0.02) g += '<line x1="' + padL + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(v).toFixed(1) + '" stroke="var(--line)"/>' + txt(padL - 8, Y(v) + 4, num(v, 2), 'text-anchor="end" fill="var(--muted)" font-size="12"');
    pts.forEach(function (p, i) {
      var x = padL + (i + 0.5) / pts.length * (W - padL - padR);
      var color = /Planck/.test(p.dataset) ? 'var(--theory)' : 'var(--obs)';
      g += '<line x1="' + x + '" y1="' + Y(p.value + p.hi).toFixed(1) + '" x2="' + x + '" y2="' + Y(p.value - p.lo).toFixed(1) + '" stroke="' + color + '" stroke-width="1.5"/>';
      g += (/Planck/.test(p.dataset) ? SHAPE.early : SHAPE.local)(x, Number(Y(p.value).toFixed(1)));
      g += txt(x, H - padB + 18, p.dataset.split(' ')[0] + ' ' + p.year, 'text-anchor="middle" fill="var(--muted)" font-size="12"');
    });
    g += txt(padL, 12, 'S₈'.replace('S₈', 'S<tspan baseline-shift="sub" font-size="9">8</tspan>'), 'fill="var(--muted)" font-size="12"');
    var table = '<div class="table-wrap"><table class="data"><tr><th>Год</th><th>Набор данных</th><th>S<sub>8</sub></th></tr>' + pts.map(function (p) {
      return '<tr><td>' + p.year + '</td><td>' + esc(p.dataset) + '</td><td>' + num(p.value) + ' +' + num(p.hi) + ' / −' + num(p.lo) + '</td></tr>';
    }).join('') + '</table></div>';
    return { html: svg(W, H, g, 'Оценки S₈: Planck 2018, KiDS-Legacy 2025, DES Y6 2026 с погрешностями') + '<p class="diagram-caption">Рост структуры: обзоры слабого линзирования рядом с Planck, каждый со своей погрешностью. Нельзя выбирать только наиболее конфликтующее значение.</p>' + table, alt: 'Три точки S₈ с погрешностями.' };
  }

  function openQuestions() {
    var h0 = Cosmo.data.h0Points();
    var early = h0.filter(function (p) { return p.id === 'H16'; })[0], local = h0.filter(function (p) { return p.id === 'H15'; })[0];
    var s8 = Cosmo.data.s8Points();
    var html = '<div class="open-q">' +
      '<div class="q"><h4>Напряжение Хаббла</h4><span class="v">' + num(early.value) + ' ± ' + num(early.hi) + ' против ' + num(local.value) + ' ± ' + num(local.hi) + ' км/с/Мпк</span><span class="n">Ранняя Вселенная (SPT+ACT+Planck, ΛCDM) и локальная сеть H0DN. Устойчиво; причина не установлена.</span></div>' +
      '<div class="q"><h4>Тёмная энергия</h4><span class="v">w<sub>0</sub> = −0,84 ± 0,10; w<sub>a</sub> = −0,44 (DES, 2026)</span><span class="n">Отклонение от Λ 2,2σ у DES; у DESI с CMB и сверхновыми — 2,7–3,2σ. Намёк, не открытие.</span></div>' +
      '<div class="q"><h4>Рост структуры</h4><span class="v">S<sub>8</sub>: ' + s8.map(function (p) { return num(p.value); }).join(' · ') + '</span><span class="n">Planck, KiDS-Legacy, DES Y6. Картина неоднородна между обзорами.</span></div></div>';
    return { html: html, alt: 'Три открытых вопроса: напряжение Хаббла, динамическая тёмная энергия, рост структуры.' };
  }

  var REG = { cepheid: cepheid, 'scale-factor': scaleFactor, 'v-d': vd, geometries: geometries, 'hot-vs-steady': hotVsSteady,
    'distance-scale': distanceScale, 'rotation-curve': rotationCurve, 'inflation-stretch': inflationStretch, firas: firas,
    'sn-standardization': snStandardization, 'cmb-peak': cmbPeak, bao: bao, composition: composition, 'method-compare': methodCompare,
    'h0-chart': function () {
      var pts = Cosmo.data.h0Points().filter(function (p) { return p.year >= 2001; });
      return h0Chart(pts, { ymin: 62, ymax: 80, xmin: 1999, xmax: 2028, height: 260, caption: 'Современные оценки H₀ (увеличение 62–80). Полный исторический диапазон и S₈ — по кнопке «Полный график».' });
    },
    'open-questions': openQuestions };

  function render(id) {
    var f = REG[id];
    if (!f) return null;
    try { return f(); } catch (e) { return { html: '<p class="muted">Схема недоступна</p>', alt: '' }; }
  }

  function fullH0() {
    var all = Cosmo.data.h0Points();
    var full = h0Chart(all, { ymin: 0, ymax: 700, xmin: 1920, xmax: 2030, height: 280, caption: 'Полный исторический диапазон. Ромбы — исторические приблизительные оценки без восстановленных погрешностей; точки не соединяются линией.' });
    var zoom = h0Chart(all.filter(function (p) { return p.year >= 1990; }), { ymin: 60, ymax: 80, xmin: 1999, xmax: 2028, height: 300, caption: 'Увеличение 60–80 км/с/Мпк. Скобки снизу отмечают коррелирующие записи одного исследования или набора данных.' });
    return { full: full, zoom: zoom, s8: s8Chart() };
  }

  return { render: render, h0Chart: h0Chart, h0Detail: h0Detail, fullH0: fullH0 };
})();
