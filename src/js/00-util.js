/* Утилиты: экранирование, форматирование индексов, ссылки, DOM */
var Cosmo = (typeof globalThis !== 'undefined' ? (globalThis.Cosmo = globalThis.Cosmo || {}) : {});

Cosmo.util = (function () {
  var SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ₓ': 'x', 'ₕ': 'h', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₚ': 'p', 'ₛ': 's', 'ₜ': 't' };
  var SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '−', '⁺': '+' };
  var subRe = /[₀-₉ₐₑₒₓₕₖₗₘₙₚₛₜ]+/g;
  var supRe = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Индексы в тексте данных хранятся как Unicode (H₀); в HTML превращаем в <sub>/<sup>,
     чтобы шрифт рисовал их своими глифами. Также [текст](url) → ссылка. */
  function fmt(s, opts) {
    opts = opts || {};
    var out = esc(s);
    out = out.replace(subRe, function (m) {
      return '<sub>' + m.split('').map(function (c) { return SUB[c] || c; }).join('') + '</sub>';
    });
    out = out.replace(supRe, function (m) {
      return '<sup>' + m.split('').map(function (c) { return SUP[c] || c; }).join('') + '</sup>';
    });
    out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    if (opts.terms) out = Cosmo.util.linkTerms(out, opts.terms);
    return out;
  }

  /* Оборачивает первое вхождение каждого термина словаря в кнопку. Вызывается после fmt,
     поэтому термины сравниваются уже в HTML-виде (H<sub>0</sub>). */
  function linkTerms(html, terms) {
    terms.forEach(function (t) {
      var needle = fmt(t.term);
      var re = new RegExp('(^|[^\\w<>/&;])(' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=$|[^\\w&;])');
      var replaced = false;
      html = html.replace(re, function (m, pre, term) {
        if (replaced) return m;
        replaced = true;
        return pre + '<button type="button" class="term" data-term="' + t.id + '" aria-label="Термин: ' + esc(t.term) + ', открыть определение">' + term + '</button>';
      });
    });
    return html;
  }

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'class') e.className = attrs[k];
      else if (k === 'dataset') Object.keys(attrs[k]).forEach(function (d) { e.dataset[d] = attrs[k][d]; });
      else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  function initials(name) {
    return name.split(/[\s-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  /* Числа с запятой как десятичным разделителем */
  function num(v, digits) {
    if (v == null) return '';
    var s = (digits != null ? Number(v).toFixed(digits) : String(v));
    return s.replace('.', ',');
  }

  function prefersReducedMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  return { esc: esc, fmt: fmt, linkTerms: linkTerms, el: el, clamp: clamp, debounce: debounce,
    initials: initials, num: num, prefersReducedMotion: prefersReducedMotion };
})();
