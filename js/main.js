/* ═══════════════════════════════════════════════════════════════════════════
   VALKORE DESKTOP — js/main.js · v2.1 (VERSÃO FINAL — substitua o arquivo
   inteiro por este conteúdo, do primeiro ao último caractere)
   [F-16] Navegação por seções: uma roda do mouse = próximo ponto de parada.
   v2.1: log de diagnóstico no console ('[Valkore F-16] ativo — X paradas').
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var NAV_H     = 80;    // offset da navbar fixa
  var DUR       = 650;   // duração de cada salto (ms)
  var INTENT_MS = 300;   // janela para encadear intenção pós-animação
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stops = [];
  var animating = false;
  var queued = 0;
  var lastIntent = 0;
  var broken = false;    // válvula de pânico: qualquer erro devolve o scroll nativo
  var html = document.documentElement;

  function maxScroll() {
    return Math.max(0, html.scrollHeight - innerHeight);
  }

  function buildStops() {
    var list = [];
    document.querySelectorAll('main > section, footer').forEach(function (sec) {
      var top = Math.max(0, sec.offsetTop - NAV_H);
      var end = sec.offsetTop + sec.offsetHeight - innerHeight;
      list.push(top);
      if (end > top + 4) list.push(Math.max(0, end)); // seção alta → 2ª parada
    });
    stops = list.filter(function (v, i) { return list.indexOf(v) === i; })
                .sort(function (a, b) { return a - b; });
    console.log('[Valkore F-16] ativo — ' + stops.length + ' paradas detectadas');
  }

  function targetFrom(dir) {
    var y = scrollY;
    var i;
    if (dir > 0) {
      for (i = 0; i < stops.length; i++) if (stops[i] > y + 2) return stops[i];
      return maxScroll();
    }
    for (i = stops.length - 1; i >= 0; i--) if (stops[i] < y - 2) return stops[i];
    return 0;
  }

  function animateTo(target) {
    if (RM) { scrollTo(0, target); return; }
    var from = scrollY;
    var dist = target - from;
    if (Math.abs(dist) < 2) return;
    var t0 = performance.now();
    html.style.scrollBehavior = 'auto';   // tween próprio: o navegador não cancela
    animating = true;
    function frame(now) {
      var t = Math.min(1, (now - t0) / DUR);
      var e = 1 - Math.pow(1 - t, 3);     // easeOutCubic
      scrollTo(0, from + dist * e);
      if (t < 1) { requestAnimationFrame(frame); return; }
      html.style.scrollBehavior = '';     // devolve o smooth (âncoras do menu)
      animating = false;
      if (queued && performance.now() - lastIntent < INTENT_MS) {
        var q = queued; queued = 0;
        animateTo(targetFrom(q));         // encadeia a intenção recebida no meio
      } else {
        queued = 0;
      }
    }
    requestAnimationFrame(frame);
  }

  function jump(dir) {
    if (!stops.length) { buildStops(); if (!stops.length) return; }
    animateTo(Math.max(0, Math.min(targetFrom(dir), maxScroll())));
  }

  addEventListener('wheel', function (e) {
    if (broken) return;
    if (e.ctrlKey) return;                                    // zoom do navegador
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;      // horizontal/trackpad
    if (e.deltaY === 0) return;
    var t = e.target;
    if (t && t.closest && t.closest('.chat-panel')) return;   // chat aberto
    e.preventDefault();
    try {
      lastIntent = performance.now();
      var dir = e.deltaY > 0 ? 1 : -1;
      if (animating) { queued = dir; return; }
      jump(dir);
    } catch (err) { broken = true; }
  }, { passive: false });

  addEventListener('keydown', function (e) {
    if (broken) return;
    if (e.key !== 'PageDown' && e.key !== 'PageUp') return;
    var t = e.target;
    if (t && t.closest && t.closest('input, textarea, .chat-panel')) return;
    e.preventDefault();
    try {
      lastIntent = performance.now();
      var dir = e.key === 'PageDown' ? 1 : -1;
      if (animating) { queued = dir; return; }
      jump(dir);
    } catch (err) { broken = true; }
  });

  var rzT;
  addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(buildStops, 200);
  });
  addEventListener('load', buildStops);
  buildStops();
})();