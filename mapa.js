/* Mapa ilustrado da coleta (rascunho).
   Geografia, nomes e pontos são fictícios. Escala: 100 unidades = 1 km. */
var Mapa = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var SERIFA = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
  var DENSO = 10;          // pontos intermediários por trecho de estrada
  var RAIO_SITIO = 30;     // 300 m: até essa distância a coleta conta como feita no sítio
  var ESPACO_GPS = 16;     // um ponto de GPS a cada 160 m
  var VELOCIDADE = 0.23;   // unidades por milissegundo na animação

  var cor = {
    chao: '#F4EBDD', curva: '#E4D5C1', curvaMestra: '#D8C4AB',
    rio: '#B3C3C6', rioTexto: '#6E8589',
    casco: '#D2C0AA', asfalto: '#FFFDF8', terra: '#CBB49D',
    sitio: '#F2E0D3', sitioLinha: '#C99D84', listra: '#E9CFBE',
    vila: '#E4D5C3', terracota: '#A65435', terracotaEscuro: '#7F3B22',
    rosa: '#EBCFC0', tinta: '#3B2E27', creme: '#FCF8F1', suave: '#75665A'
  };

  // Desenhado de oeste para leste, para o nome acompanhar o rio na leitura
  var rio = [[-20, 455], [110, 432], [200, 410], [290, 385], [370, 345], [440, 290], [500, 240], [575, 205], [650, 150], [730, 85], [820, 40]];

  var estradas = {
    principal: [[-20, 505], [60, 500], [130, 494], [205, 478], [250, 468], [280, 462], [350, 440], [420, 400], [480, 352], [540, 316], [610, 280], [700, 238], [750, 216], [820, 190]],
    norte: [[-20, 395], [80, 380], [180, 358], [290, 330], [330, 290], [400, 232], [480, 182], [560, 142], [640, 100], [705, 72], [770, 38], [820, 12]],
    ponteOeste: [[290, 330], [277, 365], [270, 391], [260, 430], [250, 468]],
    ponteLeste: [[700, 238], [703, 170], [705, 106], [705, 72]],
    terraA: [[350, 440], [365, 470], [382, 503]],
    terraM: [[610, 280], [632, 318], [664, 350]],
    terraJ: [[480, 182], [462, 152], [446, 122]]
  };
  var secundarias = ['norte', 'ponteOeste', 'ponteLeste'];
  var deTerra = ['terraA', 'terraM', 'terraJ'];
  // [ponto sobre o rio, ponto antes, ponto depois] de cada ponte
  var pontes = [[[270, 391], [277, 365], [260, 430]], [[705, 106], [703, 170], [705, 72]]];

  var morros = [
    { x: 470, y: 575, r: 175, aneis: 6, forma: [0.10, 0.6, 0.07, 1.9], passo: [3, -4] },
    { x: 735, y: 440, r: 130, aneis: 5, forma: [0.12, 2.1, 0.06, 0.4], passo: [-3, -3] },
    { x: 240, y: 150, r: 175, aneis: 6, forma: [0.11, 1.2, 0.08, 2.8], passo: [4, 2] },
    { x: 600, y: 10, r: 130, aneis: 4, forma: [0.10, 0.2, 0.06, 1.1], passo: [-2, 3] },
    { x: 30, y: 250, r: 120, aneis: 4, forma: [0.12, 2.7, 0.05, 0.9], passo: [3, 1] }
  ];

  var quadras = [[28, 468, 22, 16], [56, 466, 26, 18], [88, 470, 18, 14], [112, 464, 24, 20], [140, 468, 18, 13],
    [20, 512, 24, 18], [50, 514, 20, 16], [76, 510, 28, 20], [110, 508, 22, 16], [138, 506, 20, 18],
    [34, 536, 26, 14], [66, 538, 22, 12], [96, 534, 30, 14]];

  var galpao = [205, 478];

  // registro: onde o celular do motorista marcou a coleta
  var paradas = {
    A: { n: 1, nome: 'Antônio Silva', curto: 'Antônio', kg: 850, ponto: [382, 503], registro: [384, 501], rotulo: [20, 5, 'start'] },
    M: { n: 2, nome: 'Maria Souza', curto: 'Maria', kg: 600, ponto: [664, 350], registro: [661, 353], rotulo: [20, 5, 'start'] },
    J: { n: 3, nome: 'José Pereira', curto: 'José', kg: 720, ponto: [446, 122], registro: [480, 182], rotulo: [-20, 5, 'end'] }
  };

  // Trechos: [estrada, ponto inicial, ponto final]. Horários em minutos desde 0h.
  // Na perna do José o caminhão para no entroncamento e não sobe a estrada do sítio.
  var pernas = [
    { destino: 'A', trechos: [['principal', 3, 6], ['terraA', 0, 2]], saida: 340, chegada: 364 },
    { destino: 'M', trechos: [['terraA', 2, 0], ['principal', 6, 10], ['terraM', 0, 2]], saida: 400, chegada: 432 },
    { destino: 'J', trechos: [['terraM', 2, 0], ['principal', 10, 11], ['ponteLeste', 0, 3], ['norte', 9, 6]], saida: 470, chegada: 511 },
    { destino: 'G', trechos: [['norte', 6, 3], ['ponteOeste', 0, 4], ['principal', 4, 3]], saida: 545, chegada: 574 }
  ];
  var previsto = [['principal', 3, 11], ['terraA', 0, 2], ['terraM', 0, 2], ['ponteLeste', 0, 3], ['norte', 3, 9], ['terraJ', 0, 2], ['ponteOeste', 0, 4]];

  /* ---------- geometria ---------- */

  function dist(a, b) { return Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])); }
  function lerp(a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }

  // Catmull-Rom centrípeta. Os pontos originais ficam nos índices i * n.
  function suavizar(pts, n, fechado) {
    var m = pts.length;
    function get(i) {
      if (fechado) return pts[(i % m + m) % m];
      if (i < 0) return [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]];
      if (i >= m) return [2 * pts[m - 1][0] - pts[m - 2][0], 2 * pts[m - 1][1] - pts[m - 2][1]];
      return pts[i];
    }
    var out = [];
    var segs = fechado ? m : m - 1;
    for (var i = 0; i < segs; i++) {
      var P0 = get(i - 1), P1 = get(i), P2 = get(i + 1), P3 = get(i + 2);
      var t0 = 0;
      var t1 = t0 + Math.sqrt(dist(P0, P1)) + 1e-6;
      var t2 = t1 + Math.sqrt(dist(P1, P2)) + 1e-6;
      var t3 = t2 + Math.sqrt(dist(P2, P3)) + 1e-6;
      for (var j = 0; j < n; j++) {
        var t = t1 + (t2 - t1) * j / n;
        var A1 = lerp(P0, P1, (t - t0) / (t1 - t0));
        var A2 = lerp(P1, P2, (t - t1) / (t2 - t1));
        var A3 = lerp(P2, P3, (t - t2) / (t3 - t2));
        var B1 = lerp(A1, A2, (t - t0) / (t2 - t0));
        var B2 = lerp(A2, A3, (t - t1) / (t3 - t1));
        out.push(lerp(B1, B2, (t - t1) / (t2 - t1)));
      }
    }
    if (!fechado) out.push(pts[m - 1].slice());
    return out;
  }

  function anel(cx, cy, r, forma, achatar) {
    var pts = [];
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * 2 * Math.PI;
      var f = 1 + forma[0] * Math.sin(2 * a + forma[1]) + forma[2] * Math.sin(3 * a + forma[3]) + 0.03 * Math.sin(5 * a + forma[1] * 2);
      pts.push([cx + r * f * Math.cos(a), cy + r * achatar * f * Math.sin(a)]);
    }
    return suavizar(pts, 6, true);
  }

  function caminho(pts, fechar) {
    var s = 'M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L');
    return fechar ? s + 'Z' : s;
  }

  var densos = {};
  Object.keys(estradas).forEach(function (nome) { densos[nome] = suavizar(estradas[nome], DENSO, false); });

  function trecho(t) {
    var d = densos[t[0]], a = t[1] * DENSO, b = t[2] * DENSO;
    return a <= b ? d.slice(a, b + 1) : d.slice(b, a + 1).reverse();
  }

  function juntar(lista) {
    var out = [];
    lista.forEach(function (t) {
      var s = trecho(t);
      if (out.length && dist(out[out.length - 1], s[0]) < 0.01) s = s.slice(1);
      out = out.concat(s);
    });
    return out;
  }

  function medir(poli) {
    var cum = [0];
    for (var i = 1; i < poli.length; i++) cum.push(cum[i - 1] + dist(poli[i - 1], poli[i]));
    return cum;
  }

  function pontoNa(poli, cum, d) {
    var L = cum[cum.length - 1];
    if (d <= 0) return poli[0].slice();
    if (d >= L) return poli[poli.length - 1].slice();
    var i = 1;
    while (cum[i] < d) i++;
    return lerp(poli[i - 1], poli[i], (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1));
  }

  pernas.forEach(function (p) {
    p.poli = juntar(p.trechos);
    p.cum = medir(p.poli);
    p.L = p.cum[p.cum.length - 1];
  });

  function indicePerna(id) {
    for (var i = 0; i < pernas.length; i++) if (pernas[i].destino === id) return i;
    return -1;
  }

  /* ---------- dados ---------- */

  function hhmm(min) {
    min = Math.round(min);
    var h = Math.floor(min / 60), m = min % 60;
    return h + 'h' + (m < 10 ? '0' : '') + m;
  }
  function distancia(id) { return Math.round(dist(paradas[id].registro, paradas[id].ponto)) * 10; }
  function noSitio(id) { return dist(paradas[id].registro, paradas[id].ponto) <= RAIO_SITIO; }

  /* ---------- desenho ---------- */

  function el(nome, attrs, pai) {
    var e = document.createElementNS(NS, nome);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
  }

  function criar(svg, opcoes) {
    opcoes = opcoes || {};
    var compacto = !!opcoes.compacto;
    var k = compacto ? 1.45 : 1;
    var vb = compacto ? [170, 40, 630, 490] : [0, 0, 800, 560];
    var reduzido = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', vb.join(' '));
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Mapa ilustrado da rota do Caminhão 1, com o galpão, três sítios e o caminho registrado pelo GPS');

    var defs = el('defs', {}, svg);
    var listras = el('pattern', { id: 'mapa-listras', width: 7 * k, height: 7 * k, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, defs);
    el('rect', { width: 7 * k, height: 7 * k, fill: cor.sitio }, listras);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 7 * k, stroke: cor.listra, 'stroke-width': 2.4 * k }, listras);

    el('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: cor.chao }, svg);
    var gCurvas = el('g', { fill: 'none' }, svg);
    var gVila = el('g', { fill: cor.vila }, svg);
    var gSitios = el('g', {}, svg);
    var gRio = el('g', {}, svg);
    var gEstradas = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    var gPrevisto = el('g', { fill: 'none', stroke: cor.terracota, 'stroke-width': 2.6 * k, 'stroke-dasharray': (7 * k) + ' ' + (6 * k), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.75 }, svg);
    var linhaFeita = el('path', { fill: 'none', stroke: cor.terracota, 'stroke-width': 4 * k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    var gGps = el('g', {}, svg);
    var gMarcas = el('g', {}, svg);
    var gRotulos = el('g', {}, svg);
    var gCaminhao = el('g', {}, svg);
    var gEscala = el('g', {}, svg);

    function rotulo(x, y, texto, ancora, corTexto, tamanho, italico) {
      var t = el('text', {
        x: x, y: y, 'text-anchor': ancora || 'start', 'font-family': SERIFA, 'font-size': (tamanho || 15) * k,
        fill: corTexto || cor.tinta, stroke: cor.chao, 'stroke-width': 4 * k, 'stroke-linejoin': 'round', 'paint-order': 'stroke'
      }, gRotulos);
      if (italico) t.setAttribute('font-style', 'italic');
      t.textContent = texto;
      return t;
    }

    // relevo
    morros.forEach(function (m) {
      for (var i = 0; i < m.aneis; i++) {
        var r = m.r * (1 - i / (m.aneis + 0.6));
        var mestra = i % 3 === 2;
        el('path', {
          d: caminho(anel(m.x + m.passo[0] * i, m.y + m.passo[1] * i, r, m.forma, 0.8), true),
          stroke: mestra ? cor.curvaMestra : cor.curva, 'stroke-width': (mestra ? 1.4 : 1) * k
        }, gCurvas);
      }
    });

    // vila
    quadras.forEach(function (q) { el('rect', { x: q[0], y: q[1], width: q[2], height: q[3], rx: 2 }, gVila); });
    if (!compacto) rotulo(95, 461, 'Vila', 'middle', cor.suave, 14, true);

    // área de cada sítio
    Object.keys(paradas).forEach(function (id) {
      var p = paradas[id];
      el('path', {
        d: caminho(anel(p.ponto[0], p.ponto[1], RAIO_SITIO, [0.08, p.n, 0.05, p.n * 2], 1), true),
        fill: 'url(#mapa-listras)', stroke: cor.sitioLinha, 'stroke-width': 1.2 * k, 'stroke-dasharray': (4 * k) + ' ' + (3 * k)
      }, gSitios);
    });

    // rio
    var dRio = caminho(suavizar(rio, 8, false));
    el('path', { d: dRio, fill: 'none', stroke: cor.rio, 'stroke-width': 9 * k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gRio);
    if (!compacto) {
      el('path', { id: 'mapa-rio', d: dRio, fill: 'none' }, defs);
      var tRio = el('text', { 'font-family': SERIFA, 'font-style': 'italic', 'font-size': 13, fill: cor.rioTexto, dy: -9, 'letter-spacing': 1 }, gRio);
      el('textPath', { href: '#mapa-rio', startOffset: '57%' }, tRio).textContent = 'Córrego';
    }

    // estradas: primeiro as bordas, depois o miolo
    el('path', { d: caminho(densos.principal), stroke: cor.casco, 'stroke-width': 9 * k }, gEstradas);
    secundarias.forEach(function (n) { el('path', { d: caminho(densos[n]), stroke: cor.casco, 'stroke-width': 7 * k }, gEstradas); });
    el('path', { d: caminho(densos.principal), stroke: cor.asfalto, 'stroke-width': 6 * k }, gEstradas);
    secundarias.forEach(function (n) { el('path', { d: caminho(densos[n]), stroke: cor.asfalto, 'stroke-width': 4.5 * k }, gEstradas); });
    deTerra.forEach(function (n) { el('path', { d: caminho(densos[n]), stroke: cor.terra, 'stroke-width': 3.2 * k }, gEstradas); });
    pontes.forEach(function (pt) {
      var dx = pt[2][0] - pt[1][0], dy = pt[2][1] - pt[1][1], len = Math.sqrt(dx * dx + dy * dy);
      var u = [dx / len, dy / len], nrm = [-u[1], u[0]];
      [-1, 1].forEach(function (s) {
        var c = [pt[0][0] + s * 6 * k * nrm[0], pt[0][1] + s * 6 * k * nrm[1]];
        el('line', { x1: c[0] - 10 * k * u[0], y1: c[1] - 10 * k * u[1], x2: c[0] + 10 * k * u[0], y2: c[1] + 10 * k * u[1], stroke: cor.suave, 'stroke-width': 1.6 * k }, gEstradas);
      });
    });

    // caminho previsto
    previsto.forEach(function (t) { el('path', { d: caminho(trecho(t)) }, gPrevisto); });

    // galpão
    var gG = el('g', { transform: 'translate(' + galpao[0] + ' ' + galpao[1] + ')' }, gMarcas);
    el('rect', { x: -13 * k, y: -13 * k, width: 26 * k, height: 26 * k, rx: 6 * k, fill: cor.tinta }, gG);
    el('path', { d: 'M-6 1 L0 -5 L6 1 M-4 -1 V6 H4 V-1', fill: 'none', stroke: cor.creme, 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: 'scale(' + k + ')' }, gG);
    rotulo(galpao[0], galpao[1] + 30 * k, 'Galpão', 'middle');

    // sítios
    var marcas = {};
    Object.keys(paradas).forEach(function (id) {
      var p = paradas[id];
      var g = el('g', { transform: 'translate(' + p.ponto[0] + ' ' + p.ponto[1] + ')' }, gMarcas);
      var c = el('circle', { r: 13 * k, 'stroke-width': 2.2 * k }, g);
      var t = el('text', { 'text-anchor': 'middle', dy: '0.35em', 'font-family': SERIFA, 'font-size': 15 * k, 'font-weight': 600 }, g);
      t.textContent = p.n;
      marcas[id] = { c: c, t: t };
      estiloMarca(id, 'pendente');
      if (!compacto) rotulo(p.ponto[0] + p.rotulo[0], p.ponto[1] + p.rotulo[1], p.curto, p.rotulo[2]);
    });

    function estiloMarca(id, estado) {
      var m = marcas[id];
      m.c.setAttribute('fill', estado === 'coletado' ? cor.terracota : estado === 'fora' ? cor.rosa : cor.creme);
      m.c.setAttribute('stroke', estado === 'coletado' ? cor.terracotaEscuro : cor.terracota);
      if (estado === 'fora') m.c.setAttribute('stroke-dasharray', (3 * k) + ' ' + (2.5 * k));
      else m.c.removeAttribute('stroke-dasharray');
      m.t.setAttribute('fill', estado === 'coletado' ? '#FFFFFF' : cor.terracotaEscuro);
    }

    function marcarFora(id) {
      var p = paradas[id];
      var g = el('g', { transform: 'translate(' + p.registro[0] + ' ' + p.registro[1] + ') rotate(45)' }, gMarcas);
      el('rect', { x: -7 * k, y: -7 * k, width: 14 * k, height: 14 * k, fill: cor.terracotaEscuro, stroke: cor.creme, 'stroke-width': 2 * k }, g);
      rotulo(p.registro[0] - 22 * k, p.registro[1] - 2 * k,
        compacto ? distancia(id) + ' m' : 'Coleta a ' + distancia(id) + ' m do sítio', 'end', cor.terracotaEscuro);
    }

    // caminhão
    el('circle', { r: 15 * k, fill: cor.terracota, 'class': 'mapa-pulso' }, gCaminhao);
    el('circle', { r: 15 * k, fill: cor.tinta, stroke: cor.creme, 'stroke-width': 2.5 * k }, gCaminhao);
    el('path', { d: 'M-8 -4 H2 V4 H-8 Z M2 -1 H5.5 L8 2 V4 H2', fill: 'none', stroke: cor.creme, 'stroke-width': 1.5, 'stroke-linejoin': 'round', transform: 'scale(' + k + ')' }, gCaminhao);
    el('circle', { cx: -4.5 * k, cy: 5.5 * k, r: 1.8 * k, fill: cor.creme }, gCaminhao);
    el('circle', { cx: 5 * k, cy: 5.5 * k, r: 1.8 * k, fill: cor.creme }, gCaminhao);

    // escala e norte
    var fimX = vb[0] + vb[2], fimY = vb[1] + vb[3];
    var x0 = fimX - 24 * k - 100, y0 = fimY - 18 * k;
    el('path', { d: 'M' + x0 + ' ' + (y0 - 5 * k) + 'V' + y0 + 'H' + (x0 + 100) + 'V' + (y0 - 5 * k), fill: 'none', stroke: cor.suave, 'stroke-width': 1.5 * k }, gEscala);
    rotulo(x0 + 50, y0 - 8 * k, '1 km', 'middle', cor.suave, 12);
    var nx = x0 - 24 * k, ny = y0 - 10 * k;
    el('path', { d: 'M' + nx + ' ' + (ny - 12 * k) + 'L' + (nx + 6 * k) + ' ' + (ny + 6 * k) + 'L' + nx + ' ' + (ny + 2 * k) + 'L' + (nx - 6 * k) + ' ' + (ny + 6 * k) + 'Z', fill: cor.suave }, gEscala);
    rotulo(nx, ny - 16 * k, 'N', 'middle', cor.suave, 12);

    /* ---------- estado e movimento ---------- */

    var perna = 0, dPerna = 0, inicioPerna = 0, marca = 0;
    var posicao = galpao.slice();
    var segmentos = [[pernas[0].poli[0]]];
    var coletas = {};
    var eventos = [{ tipo: 'saida', hora: pernas[0].saida }];
    var hora = pernas[0].saida;
    var ocupado = false;

    function avisarHora(m) { hora = m; if (opcoes.aoMudarHora) opcoes.aoMudarHora(m); }

    function colocarCaminhao(p) {
      posicao = p;
      gCaminhao.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')');
    }

    function desenharFeito() {
      var d = '';
      segmentos.forEach(function (s, i) {
        var pts = i === segmentos.length - 1 ? s.concat([posicao]) : s;
        if (pts.length > 1) d += caminho(pts);
      });
      linhaFeita.setAttribute('d', d);
    }

    function pontoGps(p, minutos) {
      var c = el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 3 * k, fill: cor.creme, stroke: cor.terracotaEscuro, 'stroke-width': 1.4 * k }, gGps);
      el('title', {}, c).textContent = 'Ponto de GPS · ' + hhmm(minutos);
    }

    function horaNa(pr, d) { return pr.saida + (pr.chegada - pr.saida) * d / pr.L; }

    // anda na perna atual até a distância "ate"
    function andar(ate) {
      var pr = pernas[perna];
      var de = dPerna;
      var seg = segmentos[segmentos.length - 1];
      for (var i = 0; i < pr.poli.length; i++) if (pr.cum[i] > de && pr.cum[i] <= ate) seg.push(pr.poli[i]);
      while (marca <= inicioPerna + ate) {
        var dl = marca - inicioPerna;
        pontoGps(pontoNa(pr.poli, pr.cum, dl), horaNa(pr, dl));
        marca += ESPACO_GPS;
      }
      dPerna = ate;
      colocarCaminhao(pontoNa(pr.poli, pr.cum, ate));
      desenharFeito();
      avisarHora(horaNa(pr, ate));
    }

    function kgABordo() {
      return Object.keys(coletas).reduce(function (s, id) { return s + coletas[id].kg; }, 0);
    }

    function coletar(id, h) {
      var p = paradas[id];
      var ev = { tipo: 'coleta', id: id, nome: p.nome, kg: p.kg, hora: h, distancia: distancia(id), noSitio: noSitio(id) };
      coletas[id] = ev;
      estiloMarca(id, ev.noSitio ? 'coletado' : 'fora');
      if (!ev.noSitio) marcarFora(id);
      eventos.push(ev);
      return ev;
    }

    function chegar() {
      var pr = pernas[perna];
      inicioPerna += pr.L;
      var ev = pr.destino === 'G'
        ? { tipo: 'chegada', hora: pr.chegada, kg: kgABordo() }
        : coletar(pr.destino, pr.chegada);
      if (ev.tipo === 'chegada') eventos.push(ev);
      perna++;
      dPerna = 0;
      return ev;
    }

    function animar(aoFim) {
      var pr = pernas[perna];
      var de = dPerna, L = pr.L;
      if (reduzido) { andar(L); aoFim(chegar()); return; }
      var dur = Math.max(900, (L - de) / VELOCIDADE);
      var t0 = null;
      function quadro(t) {
        if (t0 === null) t0 = t;
        var u = Math.min(1, (t - t0) / dur);
        var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        andar(de + (L - de) * e);
        if (u < 1) requestAnimationFrame(quadro);
        else aoFim(chegar());
      }
      requestAnimationFrame(quadro);
    }

    // Situação inicial: Antônio já coletado, caminhão a caminho da Maria (6h55)
    andar(pernas[0].L);
    chegar();
    andar(pernas[1].L * 0.47);

    var api = {
      proximo: function () { return perna < pernas.length ? pernas[perna].destino : null; },
      ir: function (aoFim) {
        if (ocupado || perna >= pernas.length) return false;
        ocupado = true;
        animar(function (ev) { ocupado = false; if (aoFim) aoFim(ev); });
        return true;
      },
      // coleta fora da ordem: o caminhão aparece direto no sítio
      pular: function (id, aoFim) {
        if (ocupado || coletas[id] || !paradas[id]) return false;
        var i = indicePerna(id);
        // o relógio só anda para a frente, mesmo com a coleta fora da ordem
        var h = hora >= pernas[i].chegada ? hora + 20 : pernas[i].chegada;
        segmentos[segmentos.length - 1].push(posicao.slice());
        var ev = coletar(id, h);
        if (i + 1 >= perna) {
          perna = i + 1;
          dPerna = 0;
          inicioPerna = marca;
          var prox = pernas[perna];
          segmentos.push(prox ? [prox.poli[0]] : []);
          colocarCaminhao(prox ? prox.poli[0].slice() : paradas[id].registro.slice());
        } else {
          segmentos.push([]);
          colocarCaminhao(paradas[id].registro.slice());
        }
        desenharFeito();
        avisarHora(h);
        if (aoFim) aoFim(ev);
        return true;
      },
      aceitar: function (id) { if (coletas[id]) coletas[id].aceita = true; },
      coleta: function (id) { return coletas[id] || null; },
      eventos: function () { return eventos.slice(); },
      estado: function () {
        var ids = Object.keys(coletas);
        return {
          coletadas: ids.length,
          kg: kgABordo(),
          conferir: ids.filter(function (id) { return !coletas[id].noSitio && !coletas[id].aceita; }).length,
          proximo: api.proximo(),
          hora: hora,
          fim: perna >= pernas.length
        };
      }
    };
    return api;
  }

  return { criar: criar, hhmm: hhmm, paradas: paradas, distancia: distancia, noSitio: noSitio, _pernas: pernas };
})();

if (typeof module !== 'undefined') module.exports = Mapa;
