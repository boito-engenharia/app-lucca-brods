// ===== BRODS — desenho do mapa (camada estática pré-renderizada), decoração, luz e partículas =====
'use strict';

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function rrc(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
// ruído determinístico simples
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }

const bgStars = Array.from({ length: 90 }, () => ({ x: Math.random() * WORLD.w * 1.2 - 100, y: Math.random() * WORLD.h * 1.2 - 100, s: Math.random() * 2 + .5 }));

// ---------- Camada estática (chão + paredes + móveis fixos) ----------
const MAP_SCALE = 1.25;
let mapLayer = null;
function buildMapLayer() {
  const c = document.createElement('canvas'); c.width = Math.ceil((WORLD.w + 200) * MAP_SCALE); c.height = Math.ceil((WORLD.h + 200) * MAP_SCALE);
  const x = c.getContext('2d'); x.scale(MAP_SCALE, MAP_SCALE); x.translate(100, 100);
  const WALL = 26;
  // contorno externo grosso (sombra da casa)
  for (const r of G.walk) { x.fillStyle = '#07040f'; rrc(x, r.x - WALL - 8, r.y - WALL - 8, r.w + 2 * WALL + 16, r.h + 2 * WALL + 16, 16); x.fill(); }
  // paredes
  for (const r of ROOMS) { x.fillStyle = r.wall; rrc(x, r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL, 10); x.fill(); x.save(); x.clip(); x.fillStyle = stonePatternFor(x); x.fillRect(r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL); x.restore(); }
  for (const cr of CORRIDORS) { x.fillStyle = '#2a1f3a'; x.fillRect(cr.x - WALL, cr.y - WALL, cr.w + 2 * WALL, cr.h + 2 * WALL); x.save(); x.beginPath(); x.rect(cr.x - WALL, cr.y - WALL, cr.w + 2 * WALL, cr.h + 2 * WALL); x.clip(); x.fillStyle = stonePatternFor(x); x.fillRect(cr.x - WALL, cr.y - WALL, cr.w + 2 * WALL, cr.h + 2 * WALL); x.restore(); }
  // chão dos corredores: pedra escura com tapete vermelho no meio
  for (const cr of CORRIDORS) {
    floorStone(x, cr.x, cr.y, cr.w, cr.h, '#3e3350', '#2a2238');
    const horiz = cr.w > cr.h;
    x.fillStyle = '#7a1f2a'; if (horiz) x.fillRect(cr.x, cr.y + cr.h * .3, cr.w, cr.h * .4); else x.fillRect(cr.x + cr.w * .3, cr.y, cr.w * .4, cr.h);
    x.strokeStyle = '#c9a227'; x.lineWidth = 2; if (horiz) { x.strokeRect(cr.x - 1, cr.y + cr.h * .3 + 4, cr.w + 2, cr.h * .4 - 8); } else { x.strokeRect(cr.x + cr.w * .3 + 4, cr.y - 1, cr.w * .4 - 8, cr.h + 2); }
  }
  // chão dos cômodos
  for (const r of ROOMS) {
    const art = SPRITES['room_' + r.id];
    if (art) { x.drawImage(art, r.x, r.y, r.w, r.h); continue; }
    switch (r.id) {
      case 'biblioteca': case 'jantar': case 'quarto': case 'sotao': floorWood(x, r); break;
      case 'salao': case 'galeria': floorMarble(x, r); break;
      case 'torre': case 'porao': case 'capela': floorStone(x, r.x, r.y, r.w, r.h, r.floor, shade(r.floor, -25)); break;
      case 'cozinha': case 'laboratorio': floorTiles(x, r); break;
      case 'jardim': floorGrass(x, r); break;
      default: x.fillStyle = r.floor; x.fillRect(r.x, r.y, r.w, r.h);
    }
  }
  // portas (batentes) nas passagens
  for (const cr of CORRIDORS) for (const r of ROOMS) {
    const x0 = Math.max(r.x, cr.x), x1 = Math.min(r.x + r.w, cr.x + cr.w), y0 = Math.max(r.y, cr.y), y1 = Math.min(r.y + r.h, cr.y + cr.h);
    if (x1 >= x0 && y1 >= y0) { x.fillStyle = '#1b1226'; if (x1 - x0 > y1 - y0) { x.fillRect(x0 - 10, y0 - 5, 10, 10); x.fillRect(x1, y0 - 5, 10, 10); } else { x.fillRect(x0 - 5, y0 - 10, 10, 10); x.fillRect(x0 - 5, y1, 10, 10); } }
  }
  // rodapé / sombra interna das paredes
  for (const r of ROOMS) {
    let g = x.createLinearGradient(0, r.y, 0, r.y + 34); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(r.x, r.y, r.w, 34);
    g = x.createLinearGradient(r.x, 0, r.x + 18, 0); g.addColorStop(0, 'rgba(0,0,0,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(r.x, r.y, 18, r.h);
    g = x.createLinearGradient(r.x + r.w - 18, 0, r.x + r.w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)'); x.fillStyle = g; x.fillRect(r.x + r.w - 18, r.y, 18, r.h);
    g = x.createLinearGradient(0, r.y + r.h - 14, 0, r.y + r.h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = g; x.fillRect(r.x, r.y + r.h - 14, r.w, 14);
    // rodapé de madeira
    x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(r.x, r.y, r.w, 4);
  }
  // móveis fixos (sem animação)
  for (const d of DECOR) { const r = roomAt(d.x + 1, d.y + 1); if (r && SPRITES['room_' + r.id]) continue; drawDecorStatic(x, d); }
  // nome do cômodo gravado no chão
  for (const r of ROOMS) { if (SPRITES['room_' + r.id]) continue; x.fillStyle = 'rgba(255,255,255,.13)'; x.font = '900 20px Nunito, Trebuchet MS, Arial'; x.textAlign = 'center'; x.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + r.h - 12); }
  // passagens secretas (grades no chão)
  for (const s of SECRET) for (const [px, py] of [[s.ax, s.ay], [s.bx, s.by]]) { x.fillStyle = '#120b1c'; rrc(x, px - 24, py - 17, 48, 34, 6); x.fill(); x.strokeStyle = '#4a3a60'; x.lineWidth = 3; x.stroke(); x.fillStyle = '#4a3a60'; for (let i = -15; i <= 15; i += 7.5) x.fillRect(px + i - 1, py - 13, 2, 26); x.fillRect(px - 20, py - 1, 40, 2); }
  mapLayer = c;
}
function shade(hex, d) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) + d, g = ((n >> 8) & 255) + d, b = (n & 255) + d; r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b)); return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0'); }

// --- texturas de chão ---
function floorWood(x, r) {
  const base = r.floor; x.fillStyle = base; x.fillRect(r.x, r.y, r.w, r.h);
  const ph = 26; let row = 0;
  for (let y = r.y; y < r.y + r.h; y += ph, row++) {
    let px = r.x - (row % 2) * 90;
    while (px < r.x + r.w) {
      const len = 140 + hash(px, y) * 120; const x0 = Math.max(r.x, px), x1 = Math.min(r.x + r.w, px + len);
      const tone = (hash(px + 3, y + 7) - .5) * 22; x.fillStyle = shade(base, tone); x.fillRect(x0, y, x1 - x0, Math.min(ph, r.y + r.h - y));
      // veios
      x.strokeStyle = 'rgba(0,0,0,.13)'; x.lineWidth = 1; x.beginPath(); for (let k = 0; k < 2; k++) { const yy = y + 6 + k * 10 + hash(px, k) * 4; x.moveTo(x0 + 4, yy); x.quadraticCurveTo((x0 + x1) / 2, yy + (hash(k, px) - .5) * 6, x1 - 4, yy); } x.stroke();
      x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(x1 - 1, y, 2, ph); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(x0, y + ph - 1, x1 - x0, 1);
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(x0 + 6, y + ph / 2, 2, 2); x.fillRect(x1 - 8, y + ph / 2, 2, 2);
      px += len;
    }
  }
}
function floorMarble(x, r) {
  const T = 40, a = shade(r.floor, 10), b = shade(r.floor, -30);
  for (let yy = r.y, j = 0; yy < r.y + r.h; yy += T, j++) for (let xx = r.x, i = 0; xx < r.x + r.w; xx += T, i++) {
    const w = Math.min(T, r.x + r.w - xx), h = Math.min(T, r.y + r.h - yy);
    x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(xx, yy, w, h);
    // veio do mármore
    x.strokeStyle = (i + j) % 2 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)'; x.lineWidth = 1; x.beginPath(); x.moveTo(xx + hash(i, j) * w, yy); x.lineTo(xx + hash(j, i) * w, yy + h); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.strokeRect(xx + .5, yy + .5, w - 1, h - 1);
  }
  // brilho
  const g = x.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.06)'); x.fillStyle = g; x.fillRect(r.x, r.y, r.w, r.h);
}
function floorStone(x, x0, y0, w, h, base, dark) {
  x.fillStyle = dark; x.fillRect(x0, y0, w, h);
  const T = 46; let row = 0;
  for (let yy = y0; yy < y0 + h; yy += T, row++) { let xx = x0 - (row % 2) * 23; while (xx < x0 + w) { const sw = T + (hash(xx, yy) - .5) * 14; const ax = Math.max(x0, xx), bx = Math.min(x0 + w, xx + sw - 3), by = Math.min(y0 + h, yy + T - 3); if (bx > ax && by > yy) { x.fillStyle = shade(base, (hash(xx + 1, yy + 2) - .5) * 18); rrc(x, ax, yy, bx - ax, by - yy, 5); x.fill(); x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(ax + 2, yy + 2, bx - ax - 4, 2); } xx += sw; } }
  // rachaduras
  x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 1.5; for (let k = 0; k < 6; k++) { const cx = x0 + hash(k, 9) * w, cy = y0 + hash(9, k) * h; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 14, cy + 9); x.lineTo(cx + 22, cy + 24); x.stroke(); }
}
function floorTiles(x, r) {
  const T = 24, a = shade(r.floor, 12), b = shade(r.floor, -18);
  x.fillStyle = '#0e141a'; x.fillRect(r.x, r.y, r.w, r.h);
  for (let yy = r.y, j = 0; yy < r.y + r.h; yy += T, j++) for (let xx = r.x, i = 0; xx < r.x + r.w; xx += T, i++) { const w = Math.min(T, r.x + r.w - xx) - 2, h = Math.min(T, r.y + r.h - yy) - 2; x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(xx + 1, yy + 1, w, h); x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(xx + 2, yy + 2, w - 2, 3); }
  // manchas
  for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(80,20,90,.25)'; x.beginPath(); x.ellipse(r.x + hash(k, 1) * r.w, r.y + hash(2, k) * r.h, 14 + hash(k, k) * 16, 8 + hash(k, 3) * 8, hash(k, 5) * 3, 0, 7); x.fill(); }
}
function floorGrass(x, r) {
  x.fillStyle = r.floor; x.fillRect(r.x, r.y, r.w, r.h);
  for (let k = 0; k < 900; k++) { const px = r.x + hash(k, 11) * r.w, py = r.y + hash(12, k) * r.h; x.fillStyle = k % 3 ? 'rgba(0,0,0,.18)' : 'rgba(120,200,90,.2)'; x.fillRect(px, py, 2, 4 + hash(k, 2) * 4); }
  for (let k = 0; k < 8; k++) { x.fillStyle = 'rgba(0,0,0,.14)'; x.beginPath(); x.ellipse(r.x + hash(k, 21) * r.w, r.y + hash(22, k) * r.h, 30 + hash(k, 1) * 40, 20 + hash(k, 2) * 20, 0, 0, 7); x.fill(); }
  // caminho de pedras
  x.fillStyle = '#6f6a75'; for (let k = 0; k < 9; k++) { const px = r.x + 60 + k * 50 + (hash(k, 7) - .5) * 12, py = r.y + r.h - 60 - Math.sin(k * .7) * 30; x.beginPath(); x.ellipse(px, py, 16, 11, hash(k, 3), 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 2; x.stroke(); }
}

// ---------- Textura de pedra das paredes ----------
let _stone = null;
function stonePatternFor(x) {
  if (_stone) return _stone;
  const c = document.createElement('canvas'); c.width = 64; c.height = 48; const k = c.getContext('2d');
  k.strokeStyle = 'rgba(0,0,0,.4)'; k.lineWidth = 2;
  for (let row = 0; row < 3; row++) { const y = row * 16 + 8; k.beginPath(); k.moveTo(0, y); k.lineTo(64, y); k.stroke(); const off = row % 2 ? 16 : 0; for (let bx = off; bx < 64; bx += 32) { k.beginPath(); k.moveTo(bx, y - 8); k.lineTo(bx, y + 8); k.stroke(); } }
  k.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 14; i++) k.fillRect(hash(i, 1) * 64, hash(2, i) * 48, 6, 2);
  k.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 10; i++) k.fillRect(hash(i, 5) * 64, hash(6, i) * 48, 4, 4);
  _stone = x.createPattern(c, 'repeat'); return _stone;
}
function stonePattern() { return stonePatternFor(ctx); }

// ---------- Móveis (estáticos, desenhados na camada) ----------
function shadow(x, cx, cy, w, h) { x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(cx, cy, w, h, 0, 0, 7); x.fill(); }
function outlineRect(x, px, py, w, h, r) { x.strokeStyle = '#000'; x.lineWidth = 3; rrc(x, px, py, w, h, r || 4); x.stroke(); }
function drawDecorStatic(x, d) {
  x.save();
  switch (d.type) {
    case 'window': { x.fillStyle = '#07040f'; rrc(x, d.x, d.y, d.w, d.h, 6); x.fill(); const g = x.createLinearGradient(d.x, d.y, d.x, d.y + d.h); g.addColorStop(0, 'rgba(120,150,255,.35)'); g.addColorStop(1, 'rgba(120,150,255,.05)'); x.fillStyle = g; x.fillRect(d.x, d.y, d.w, d.h); x.strokeStyle = '#d8c8a0'; x.lineWidth = 4; rrc(x, d.x, d.y, d.w, d.h, 6); x.stroke(); x.beginPath(); x.moveTo(d.x + d.w / 2, d.y); x.lineTo(d.x + d.w / 2, d.y + d.h); x.moveTo(d.x, d.y + d.h / 2); x.lineTo(d.x + d.w, d.y + d.h / 2); x.stroke(); x.fillStyle = '#f4efc2'; x.beginPath(); x.arc(d.x + d.w * .7, d.y + d.h * .35, 7, 0, 7); x.fill();
      // feixe de luar no chão
      const b = x.createLinearGradient(0, d.y + d.h, 0, d.y + d.h + 160); b.addColorStop(0, 'rgba(150,180,255,.22)'); b.addColorStop(1, 'rgba(150,180,255,0)'); x.fillStyle = b; x.beginPath(); x.moveTo(d.x, d.y + d.h); x.lineTo(d.x + d.w, d.y + d.h); x.lineTo(d.x + d.w + 40, d.y + d.h + 160); x.lineTo(d.x - 40, d.y + d.h + 160); x.closePath(); x.fill(); break; }
    case 'telescope': shadow(x, d.x, d.y + 72, 26, 8); x.strokeStyle = '#000'; x.lineWidth = 6; x.beginPath(); x.moveTo(d.x, d.y + 40); x.lineTo(d.x - 16, d.y + 72); x.moveTo(d.x, d.y + 40); x.lineTo(d.x + 16, d.y + 72); x.moveTo(d.x, d.y + 40); x.lineTo(d.x, d.y + 74); x.stroke(); x.strokeStyle = '#000'; x.lineWidth = 14; x.beginPath(); x.moveTo(d.x - 4, d.y + 44); x.lineTo(d.x + 44, d.y - 4); x.stroke(); x.strokeStyle = '#c9a85a'; x.lineWidth = 9; x.beginPath(); x.moveTo(d.x - 4, d.y + 44); x.lineTo(d.x + 44, d.y - 4); x.stroke(); x.strokeStyle = '#f0dc9a'; x.lineWidth = 2; x.beginPath(); x.moveTo(d.x + 2, d.y + 36); x.lineTo(d.x + 40, d.y - 2); x.stroke(); break;
    case 'chest': shadow(x, d.x + 35, d.y + 50, 40, 9); x.fillStyle = '#5a3414'; rrc(x, d.x, d.y, 70, 48, 7); x.fill(); x.fillStyle = '#7a4a1e'; rrc(x, d.x, d.y, 70, 22, 7); x.fill(); x.fillStyle = '#c9a227'; x.fillRect(d.x + 28, d.y + 16, 14, 16); x.fillRect(d.x + 4, d.y + 21, 62, 3); outlineRect(x, d.x, d.y, 70, 48, 7); break;
    case 'boxes': for (const [ox, oy, s] of [[0, 0, 50], [55, 10, 40], [12, -30, 36]]) { shadow(x, d.x + ox + s / 2, d.y + oy + s + 3, s / 2, 6); x.fillStyle = '#a67c52'; x.fillRect(d.x + ox, d.y + oy, s, s); x.fillStyle = '#8a6238'; x.fillRect(d.x + ox, d.y + oy, s, 6); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(d.x + ox, d.y + oy); x.lineTo(d.x + ox + s, d.y + oy + s); x.moveTo(d.x + ox + s, d.y + oy); x.lineTo(d.x + ox, d.y + oy + s); x.stroke(); outlineRect(x, d.x + ox, d.y + oy, s, s, 3); } break;
    case 'web': x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.5; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(d.x, d.y); const a = Math.PI / 2 + i * Math.PI / 8; x.lineTo(d.x + Math.cos(a) * 46, d.y + Math.sin(a) * 46); x.stroke(); } for (let r = 10; r < 46; r += 9) { x.beginPath(); x.arc(d.x, d.y, r, Math.PI * .5, Math.PI); x.stroke(); } break;
    case 'bed': shadow(x, d.x + 55, d.y + 150, 58, 10); x.fillStyle = '#4a2a14'; rrc(x, d.x - 4, d.y - 6, 118, 160, 10); x.fill(); x.fillStyle = '#8b1a1a'; rrc(x, d.x, d.y, 110, 150, 8); x.fill(); x.fillStyle = '#a32424'; for (let yy = d.y + 60; yy < d.y + 150; yy += 14) x.fillRect(d.x + 6, yy, 98, 6); x.fillStyle = '#fff'; rrc(x, d.x + 8, d.y + 8, 42, 34, 10); x.fill(); rrc(x, d.x + 60, d.y + 8, 42, 34, 10); x.fill(); x.fillStyle = '#eee'; x.fillRect(d.x + 4, d.y + 48, 102, 10); outlineRect(x, d.x, d.y, 110, 150, 8); break;
    case 'rug': x.fillStyle = '#8d2b6d'; rrc(x, d.x, d.y, d.w, d.h, 14); x.fill(); x.strokeStyle = '#e4b04a'; x.lineWidth = 3; rrc(x, d.x + 8, d.y + 8, d.w - 16, d.h - 16, 8); x.stroke(); x.fillStyle = '#e4b04a'; x.beginPath(); x.ellipse(d.x + d.w / 2, d.y + d.h / 2, 30, 16, 0, 0, 7); x.fill(); x.fillStyle = '#8d2b6d'; x.beginPath(); x.ellipse(d.x + d.w / 2, d.y + d.h / 2, 22, 10, 0, 0, 7); x.fill(); break;
    case 'painting': { x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(d.x + 4, d.y + 4, 84, 64); x.fillStyle = '#c9a227'; x.fillRect(d.x, d.y, 84, 64); x.fillStyle = '#8f6d10'; x.fillRect(d.x + 4, d.y + 4, 76, 56); const g = x.createLinearGradient(d.x, d.y, d.x, d.y + 64); g.addColorStop(0, shade(d.c, 30)); g.addColorStop(1, shade(d.c, -30)); x.fillStyle = g; x.fillRect(d.x + 8, d.y + 8, 68, 48); x.fillStyle = '#222'; x.beginPath(); x.ellipse(d.x + 42, d.y + 40, 16, 20, 0, 0, 7); x.fill(); x.fillStyle = '#e8d8c0'; x.beginPath(); x.arc(d.x + 42, d.y + 28, 11, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(d.x + 37, d.y + 27, 3.5, 0, 7); x.arc(d.x + 47, d.y + 27, 3.5, 0, 7); x.fill(); outlineRect(x, d.x, d.y, 84, 64, 2); break; }
    case 'shelf': { x.fillStyle = '#3a2010'; x.fillRect(d.x, d.y, d.w, 56); const cols = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#f1c40f', '#16a085', '#7f8c8d']; let px = d.x + 6; let i = 0; while (px < d.x + d.w - 10) { const bw = 9 + hash(i, d.x) * 6, bh = 34 + hash(d.x, i) * 12; x.fillStyle = cols[i % cols.length]; x.fillRect(px, d.y + 52 - bh, bw, bh); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(px + 2, d.y + 52 - bh + 4, bw - 4, 2); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + bw - 2, d.y + 52 - bh, 2, bh); px += bw + 1; i++; } x.fillStyle = '#5a3414'; x.fillRect(d.x, d.y + 52, d.w, 5); outlineRect(x, d.x, d.y, d.w, 57, 3); break; }
    case 'table': shadow(x, d.x, d.y + 40, 62, 12); x.fillStyle = '#5a3a1e'; x.beginPath(); x.ellipse(d.x, d.y, 62, 38, 0, 0, 7); x.fill(); x.fillStyle = '#6b482a'; x.beginPath(); x.ellipse(d.x, d.y - 3, 56, 32, 0, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.ellipse(d.x, d.y, 62, 38, 0, 0, 7); x.stroke(); x.fillStyle = '#f4efc2'; x.fillRect(d.x - 16, d.y - 12, 30, 20); x.strokeStyle = '#b8a880'; x.lineWidth = 1; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(d.x - 12, d.y - 8 + i * 4); x.lineTo(d.x + 10, d.y - 8 + i * 4); x.stroke(); } x.fillStyle = '#fff'; x.fillRect(d.x + 26, d.y - 10, 5, 12); break;
    case 'stairs': { x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(d.x - 6, d.y - 4, 132, 92); for (let i = 0; i < 5; i++) { x.fillStyle = shade('#5a2f78', -i * 8); x.fillRect(d.x, d.y + i * 16, 120, 16); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(d.x, d.y + i * 16, 120, 3); } x.fillStyle = '#a8262f'; x.fillRect(d.x + 44, d.y, 32, 80); x.fillStyle = '#c9a227'; x.fillRect(d.x - 3, d.y, 5, 80); x.fillRect(d.x + 118, d.y, 5, 80); outlineRect(x, d.x, d.y, 120, 80, 2); break; }
    case 'carpet': x.fillStyle = '#7e1c23'; rrc(x, d.x, d.y, d.w, d.h, 10); x.fill(); x.fillStyle = '#a8262f'; rrc(x, d.x + 10, d.y + 10, d.w - 20, d.h - 20, 6); x.fill(); x.strokeStyle = '#e4b04a'; x.lineWidth = 3; rrc(x, d.x + 10, d.y + 10, d.w - 20, d.h - 20, 6); x.stroke(); x.strokeStyle = 'rgba(228,176,74,.5)'; x.lineWidth = 2; rrc(x, d.x + 20, d.y + 20, d.w - 40, d.h - 40, 4); x.stroke(); break;
    case 'button': shadow(x, d.x, d.y + 30, 32, 9); x.fillStyle = '#333'; x.beginPath(); x.arc(d.x, d.y, 28, 0, 7); x.fill(); x.fillStyle = '#555'; x.beginPath(); x.arc(d.x, d.y - 3, 24, 0, 7); x.fill(); x.fillStyle = '#b0101a'; x.beginPath(); x.arc(d.x, d.y, 17, 0, 7); x.fill(); x.fillStyle = '#ff3040'; x.beginPath(); x.arc(d.x - 4, d.y - 5, 9, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.arc(d.x, d.y, 28, 0, 7); x.stroke(); x.fillStyle = '#fff'; x.font = '900 10px Nunito, Arial'; x.textAlign = 'center'; x.fillText('EMERGÊNCIA', d.x, d.y + 44); break;
    case 'dtable': shadow(x, d.x + 110, d.y + 96, 115, 14); x.fillStyle = '#4a2a14'; rrc(x, d.x - 4, d.y - 4, 228, 98, 12); x.fill(); x.fillStyle = '#b22'; rrc(x, d.x, d.y, 220, 90, 10); x.fill(); x.fillStyle = '#d33'; rrc(x, d.x + 8, d.y + 8, 204, 74, 8); x.fill(); x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(d.x + 35 + i * 50, d.y + 45, 15, 0, 7); x.fill(); x.fillStyle = '#eee'; x.beginPath(); x.arc(d.x + 35 + i * 50, d.y + 45, 9, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(d.x + 18 + i * 50, d.y + 36, 3, 18); x.fillRect(d.x + 50 + i * 50, d.y + 36, 3, 18); } outlineRect(x, d.x, d.y, 220, 90, 10); break;
    case 'stove': shadow(x, d.x + 45, d.y + 54, 48, 8); x.fillStyle = '#444'; rrc(x, d.x, d.y, 90, 50, 4); x.fill(); x.fillStyle = '#666'; x.fillRect(d.x + 4, d.y + 4, 82, 10); x.fillStyle = '#111'; for (const o of [22, 66]) { x.beginPath(); x.arc(d.x + o, d.y + 30, 14, 0, 7); x.fill(); x.strokeStyle = '#2a2a2a'; x.lineWidth = 2; x.beginPath(); x.arc(d.x + o, d.y + 30, 9, 0, 7); x.stroke(); } outlineRect(x, d.x, d.y, 90, 50, 4); break;
    case 'knives': x.fillStyle = '#5a3414'; x.fillRect(d.x, d.y, 84, 14); x.fillStyle = '#7a4a1e'; x.fillRect(d.x, d.y, 84, 5); for (let i = 0; i < 4; i++) { x.fillStyle = '#ddd'; x.fillRect(d.x + 10 + i * 19, d.y + 14, 5, 28); x.fillStyle = '#999'; x.fillRect(d.x + 12 + i * 19, d.y + 14, 2, 28); x.fillStyle = '#222'; x.fillRect(d.x + 9 + i * 19, d.y + 10, 7, 6); } break;
    case 'powerbox': shadow(x, d.x, d.y + 34, 30, 6); x.fillStyle = '#555'; rrc(x, d.x - 26, d.y - 32, 52, 64, 4); x.fill(); x.fillStyle = '#777'; x.fillRect(d.x - 22, d.y - 28, 44, 10); x.fillStyle = '#222'; x.fillRect(d.x - 18, d.y - 12, 36, 30); x.fillStyle = '#ffd300'; x.font = '900 22px Arial'; x.textAlign = 'center'; x.fillText('⚡', d.x, d.y + 12); outlineRect(x, d.x - 26, d.y - 32, 52, 64, 4); break;
    case 'barrel': shadow(x, d.x, d.y + 30, 24, 6); x.fillStyle = '#6b4018'; x.beginPath(); x.ellipse(d.x, d.y, 22, 28, 0, 0, 7); x.fill(); x.fillStyle = '#8a5a2a'; x.beginPath(); x.ellipse(d.x - 5, d.y - 4, 12, 20, 0, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.ellipse(d.x, d.y, 22, 28, 0, 0, 7); x.stroke(); x.strokeStyle = '#3a3a3a'; x.lineWidth = 3; x.beginPath(); x.moveTo(d.x - 21, d.y - 9); x.lineTo(d.x + 21, d.y - 9); x.moveTo(d.x - 21, d.y + 9); x.lineTo(d.x + 21, d.y + 9); x.stroke(); break;
    case 'cage': x.fillStyle = 'rgba(0,0,0,.45)'; rrc(x, d.x - 4, d.y - 4, 108, 98, 6); x.fill(); x.fillStyle = '#2a2a33'; x.fillRect(d.x, d.y, 100, 90); x.strokeStyle = '#aaa'; x.lineWidth = 4; x.strokeRect(d.x, d.y, 100, 90); for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(d.x + i * 16, d.y); x.lineTo(d.x + i * 16, d.y + 90); x.stroke(); } x.strokeStyle = '#777'; x.lineWidth = 2; x.beginPath(); x.moveTo(d.x, d.y + 45); x.lineTo(d.x + 100, d.y + 45); x.stroke(); x.fillStyle = '#c9a227'; x.fillRect(d.x + 96, d.y + 38, 10, 14); break;
    case 'altar': shadow(x, d.x, d.y + 44, 56, 9); x.fillStyle = '#8c8c99'; rrc(x, d.x - 54, d.y + 6, 108, 40, 6); x.fill(); x.fillStyle = '#e6e6ee'; rrc(x, d.x - 50, d.y, 100, 40, 6); x.fill(); x.fillStyle = '#f6f6fa'; x.fillRect(d.x - 46, d.y + 4, 92, 8); outlineRect(x, d.x - 50, d.y, 100, 40, 6); x.fillStyle = '#c9a227'; x.fillRect(d.x - 4, d.y - 42, 8, 44); x.fillRect(d.x - 18, d.y - 32, 36, 8); x.fillStyle = '#fff'; x.fillRect(d.x - 36, d.y - 14, 6, 16); x.fillRect(d.x + 30, d.y - 14, 6, 16); break;
    case 'bench': shadow(x, d.x + 55, d.y + 28, 56, 6); x.fillStyle = '#4a2a14'; rrc(x, d.x, d.y, 110, 28, 5); x.fill(); x.fillStyle = '#6b482a'; x.fillRect(d.x + 3, d.y + 3, 104, 8); outlineRect(x, d.x, d.y, 110, 28, 5); break;
    case 'bush': shadow(x, d.x + 4, d.y + 30, 50, 10); for (const [ox, oy, r, c] of [[0, 0, 30, '#1f5a2a'], [30, 10, 24, '#246b32'], [-25, 12, 22, '#1a4d24'], [4, -10, 18, '#2b7a3a']]) { x.fillStyle = c; x.beginPath(); x.arc(d.x + ox, d.y + oy, r, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2.5; x.stroke(); } break;
    case 'tomb': shadow(x, d.x + 22, d.y + 62, 26, 6); x.fillStyle = '#6f6f7a'; rrc(x, d.x + 3, d.y + 3, 44, 60, 14); x.fill(); x.fillStyle = '#9a9aa6'; rrc(x, d.x, d.y, 44, 60, 14); x.fill(); x.fillStyle = '#b8b8c4'; rrc(x, d.x + 4, d.y + 4, 20, 50, 10); x.fill(); outlineRect(x, d.x, d.y, 44, 60, 14); x.fillStyle = '#333'; x.font = '900 18px Arial'; x.textAlign = 'center'; x.fillText('✝', d.x + 22, d.y + 38); break;
    case 'gate': x.strokeStyle = '#111'; x.lineWidth = 6; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(d.x + i * 18, d.y); x.lineTo(d.x + i * 18, d.y + 70); x.stroke(); } x.beginPath(); x.moveTo(d.x - 4, d.y + 10); x.lineTo(d.x + 112, d.y + 10); x.moveTo(d.x - 4, d.y + 55); x.lineTo(d.x + 112, d.y + 55); x.stroke(); x.fillStyle = '#333'; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(d.x + i * 18 - 5, d.y); x.lineTo(d.x + i * 18, d.y - 10); x.lineTo(d.x + i * 18 + 5, d.y); x.fill(); } break;
    case 'tree': shadow(x, d.x, d.y + 62, 40, 10); x.fillStyle = '#2a1a0a'; x.fillRect(d.x - 9, d.y, 18, 62); x.strokeStyle = '#2a1a0a'; x.lineWidth = 7; x.beginPath(); x.moveTo(d.x, d.y + 10); x.lineTo(d.x - 30, d.y - 20); x.moveTo(d.x, d.y + 4); x.lineTo(d.x + 28, d.y - 24); x.moveTo(d.x - 18, d.y - 10); x.lineTo(d.x - 34, d.y - 40); x.stroke(); x.fillStyle = '#1f4d2a'; for (const [ox, oy, r] of [[-20, -30, 26], [18, -34, 24], [0, -50, 22]]) { x.beginPath(); x.arc(d.x + ox, d.y + oy, r, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2.5; x.stroke(); } break;
    case 'bench2': shadow(x, d.x + d.w / 2, d.y + 46, d.w / 2, 8); x.fillStyle = '#2f3450'; rrc(x, d.x, d.y, d.w, 46, 6); x.fill(); x.fillStyle = '#48507a'; x.fillRect(d.x + 4, d.y + 4, d.w - 8, 10); outlineRect(x, d.x, d.y, d.w, 46, 6); x.fillStyle = '#ddd'; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(d.x + 20 + i * 28, d.y + 30, 5, 0, 7); x.fill(); } break;
    case 'flasks': for (const [o, c] of [[0, '#e74c3c'], [22, '#3498db'], [44, '#2ecc71'], [66, '#f1c40f']]) { x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.arc(d.x + o, d.y + 22, 12, 0, 7); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(d.x + o, d.y + 24, 10, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(d.x + o - 4, d.y, 8, 18); x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(d.x + o, d.y + 22, 12, 0, 7); x.stroke(); x.strokeRect(d.x + o - 4, d.y, 8, 18); } break;
    case 'tank': shadow(x, d.x + 25, d.y + 112, 30, 8); x.fillStyle = '#333'; rrc(x, d.x - 4, d.y - 6, 58, 122, 22); x.fill(); x.fillStyle = 'rgba(120,220,255,.6)'; rrc(x, d.x, d.y, 50, 110, 20); x.fill(); x.fillStyle = 'rgba(255,255,255,.25)'; rrc(x, d.x + 6, d.y + 8, 10, 90, 5); x.fill(); outlineRect(x, d.x, d.y, 50, 110, 20); break;
    case 'candel': x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(d.x, d.y + 52, 14, 5, 0, 0, 7); x.fill(); x.fillStyle = '#c9a227'; x.fillRect(d.x - 3, d.y, 6, 50); x.fillRect(d.x - 22, d.y + 10, 44, 5); x.fillStyle = '#8f6d10'; x.fillRect(d.x - 1, d.y, 2, 50); for (const o of [-20, 0, 20]) { x.fillStyle = '#fff'; x.fillRect(d.x + o - 3, d.y - 12, 6, 22); x.fillStyle = '#ddd'; x.fillRect(d.x + o + 1, d.y - 12, 2, 22); } break;
    case 'cauldron': shadow(x, d.x, d.y + 32, 44, 10); x.fillStyle = '#151515'; x.beginPath(); x.ellipse(d.x, d.y + 2, 44, 32, 0, 0, 7); x.fill(); x.fillStyle = '#2a2a2a'; x.beginPath(); x.ellipse(d.x, d.y, 40, 30, 0, 0, 7); x.fill(); x.fillStyle = '#3a3a3a'; x.beginPath(); x.ellipse(d.x - 8, d.y - 6, 22, 14, 0, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.ellipse(d.x, d.y, 40, 30, 0, 0, 7); x.stroke(); break;
  }
  x.restore();
}

// ---------- Partes animadas dos móveis (desenhadas por frame) ----------
function drawDecorLive(d) {
  switch (d.type) {
    case 'candel': for (const o of [-20, 0, 20]) { const fy = d.y - 16 + Math.sin(G.t * 9 + o) * 1.5; const g = ctx.createRadialGradient(d.x + o, fy, 0, d.x + o, fy, 14); g.addColorStop(0, 'rgba(255,220,120,.9)'); g.addColorStop(.4, 'rgba(255,150,40,.5)'); g.addColorStop(1, 'rgba(255,120,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x + o, fy, 14, 0, 7); ctx.fill(); ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(d.x + o, fy, 3, 5, 0, 0, 7); ctx.fill(); } break;
    case 'cauldron': ctx.fillStyle = '#6ad35a'; ctx.beginPath(); ctx.ellipse(d.x, d.y - 8, 30, 12, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#9ff08a'; for (let i = 0; i < 4; i++) { const ph = (G.t * .7 + i * .25) % 1; ctx.beginPath(); ctx.arc(d.x - 18 + i * 12, d.y - 8 + Math.sin(G.t * 3 + i) * 3, 3 + ph * 3, 0, 7); ctx.fill(); } for (let i = 0; i < 3; i++) { const ph = (G.t * .8 + i * .7) % 1; ctx.fillStyle = `rgba(160,255,140,${(1 - ph) * .8})`; ctx.beginPath(); ctx.arc(d.x - 15 + i * 15, d.y - 14 - ph * 46, 5 + ph * 8, 0, 7); ctx.fill(); } break;
    case 'painting': ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(d.x + 37 + Math.sin(G.t * .8 + d.x) * 2, d.y + 27, 2, 0, 7); ctx.arc(d.x + 47 + Math.sin(G.t * .8 + d.x) * 2, d.y + 27, 2, 0, 7); ctx.fill(); break;
    case 'tank': ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 4; i++) { const ph = (G.t * .5 + i * .25) % 1; ctx.beginPath(); ctx.arc(d.x + 12 + i * 9, d.y + 100 - ph * 90, 3, 0, 7); ctx.fill(); } break;
    case 'powerbox': ctx.fillStyle = G.dark ? '#c22' : '#2c2'; ctx.beginPath(); ctx.arc(d.x + 18, d.y - 22, 3, 0, 7); ctx.fill(); break;
  }
}

// ---------- drawMap: camada estática + dinâmicos ----------
function drawMap() {
  if (!mapLayer) buildMapLayer();
  // fundo externo (noite)
  ctx.fillStyle = '#0e0820'; ctx.fillRect(-2000, -2000, WORLD.w + 4000, WORLD.h + 4000);
  ctx.fillStyle = '#fff'; for (const s of bgStars) { ctx.globalAlpha = .5 + .5 * Math.sin(G.t * 2 + s.x); ctx.fillRect(s.x, s.y, s.s, s.s); } ctx.globalAlpha = 1;
  // lua com halo
  let g = ctx.createRadialGradient(WORLD.w - 120, -60, 60, WORLD.w - 120, -60, 220); g.addColorStop(0, 'rgba(244,239,194,.25)'); g.addColorStop(1, 'rgba(244,239,194,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(WORLD.w - 120, -60, 220, 0, 7); ctx.fill();
  ctx.fillStyle = '#f4efc2'; ctx.beginPath(); ctx.arc(WORLD.w - 120, -60, 70, 0, 7); ctx.fill(); ctx.fillStyle = '#0e0820'; ctx.beginPath(); ctx.arc(WORLD.w - 90, -80, 62, 0, 7); ctx.fill();
  // camada estática
  ctx.drawImage(mapLayer, -100, -100, mapLayer.width / MAP_SCALE, mapLayer.height / MAP_SCALE);
  // partes animadas
  for (const d of DECOR) { const r = roomAt(d.x + 1, d.y + 1); if (r && SPRITES['room_' + r.id]) continue; drawDecorLive(d); }
  // portas trancadas
  for (const b of SAB.blocked) { ctx.fillStyle = '#3a2612'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.fillStyle = '#c9a227'; if (b.w > b.h) for (let i = 0; i < b.w; i += 24) ctx.fillRect(b.x + i + 8, b.y + 4, 6, 8); else for (let i = 0; i < b.h; i += 24) ctx.fillRect(b.x + 4, b.y + i + 8, 8, 6); }
  // alvos de sabotagem
  if (SAB.active && SAB.active.type === 'lights') { const p = SAB.POWER; ctx.fillStyle = `rgba(255,211,0,${.3 + .3 * Math.sin(G.t * 6)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffd300'; ctx.lineWidth = 3; ctx.stroke(); }
  if (SAB.active && SAB.active.type === 'ghosts') { const p = SAB.BELL; ctx.fillStyle = `rgba(255,60,60,${.3 + .3 * Math.sin(G.t * 8)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 80, 0, 7); ctx.fill(); ctx.strokeStyle = '#ff1a1a'; ctx.lineWidth = 3; ctx.stroke(); ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🔔', p.x, p.y + 14); }
  // estações de missão
  for (const m of visibleStations()) {
    const done = m.done; const pulse = done ? 0 : (Math.sin(G.t * 4) + 1) / 2;
    ctx.fillStyle = done ? 'rgba(31,191,107,.3)' : `rgba(255,211,0,${.22 + .22 * pulse})`; ctx.beginPath(); ctx.arc(m.x, m.y, 26 + pulse * 4, 0, 7); ctx.fill();
    ctx.strokeStyle = done ? '#1fbf6b' : '#ffd300'; ctx.lineWidth = 3; ctx.stroke();
    if (!done) { ctx.strokeStyle = `rgba(255,211,0,${.6 - pulse * .6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, 30 + pulse * 16, 0, 7); ctx.stroke(); }
    ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(done ? '✔' : m.icon, m.x, m.y + 2); ctx.textBaseline = 'alphabetic';
  }
}

// ---------- Iluminação (escuridão + luzes) ----------
const lightCanvas = document.createElement('canvas');
function lightSources() {
  const L = [];
  for (const d of DECOR) {
    if (d.type === 'candel') L.push({ x: d.x, y: d.y - 10, r: 200, c: '255,180,60', f: 1 });
    else if (d.type === 'window') L.push({ x: d.x + d.w / 2, y: d.y + d.h + 40, r: 230, c: '160,190,255', f: 0 });
    else if (d.type === 'cauldron') L.push({ x: d.x, y: d.y - 10, r: 180, c: '120,255,120', f: 1 });
    else if (d.type === 'tank') L.push({ x: d.x + 25, y: d.y + 55, r: 160, c: '120,200,255', f: 0 });
    else if (d.type === 'altar') L.push({ x: d.x, y: d.y - 20, r: 190, c: '255,200,90', f: 1 });
    else if (d.type === 'powerbox') L.push({ x: d.x, y: d.y, r: 120, c: '255,220,80', f: 1 });
    else if (d.type === 'stairs') L.push({ x: d.x + 60, y: d.y + 40, r: 270, c: '255,210,120', f: 0 });
    else if (d.type === 'flasks') L.push({ x: d.x + 30, y: d.y + 20, r: 120, c: '200,120,255', f: 0 });
  }
  return L;
}
let _lights = null;
function drawLighting() {
  if (!_lights) _lights = lightSources();
  const lc = lightCanvas; if (lc.width !== canvas.width || lc.height !== canvas.height) { lc.width = canvas.width; lc.height = canvas.height; }
  const x = lc.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
  const darkMe = G.dark && G.player && G.player.kind !== 'demom' && G.player.alive;
  x.fillStyle = darkMe ? 'rgba(4,0,14,.97)' : 'rgba(10,4,28,.42)'; x.fillRect(0, 0, lc.width, lc.height);
  const z = G.cam.zoom; x.setTransform(z, 0, 0, z, lc.width / 2 - G.cam.x * z, lc.height / 2 - G.cam.y * z);
  x.globalCompositeOperation = 'destination-out';
  const flick = .9 + Math.sin(G.t * 13) * .05 + Math.sin(G.t * 29) * .05;
  const spot = (lx, ly, r, a) => { const g = x.createRadialGradient(lx, ly, 0, lx, ly, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.5, `rgba(0,0,0,${a * .55})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(lx, ly, r, 0, 7); x.fill(); };
  if (!darkMe) for (const l of _lights) spot(l.x, l.y, l.r * (l.f ? flick : 1), .9);
  for (const m of visibleStations()) if (!m.done) spot(m.x, m.y, 90, .6);
  for (const e of G.entities) { if (!e.alive && e !== G.player) continue; if (e.swallowed) continue; spot(e.x, e.y - 20, darkMe ? (e === G.player ? 150 : 60) : 240, 1); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lc, 0, 0);
  // vinheta
  const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * .45, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  if (!darkMe) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const l of _lights) { const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * .6); g.addColorStop(0, `rgba(${l.c},${.22 * (l.f ? flick : 1)})`); g.addColorStop(1, `rgba(${l.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * .6, 0, 7); ctx.fill(); } ctx.restore(); }
}

// ---------- Partículas: poeira, morcegos, névoa ----------
const PARTS = { dust: [], bats: [], fog: [] };
function initParticles() {
  PARTS.dust = Array.from({ length: 140 }, () => ({ x: Math.random() * WORLD.w, y: Math.random() * WORLD.h, s: Math.random() * 1.6 + .6, p: Math.random() * 7, v: 6 + Math.random() * 10 }));
  PARTS.bats = Array.from({ length: 5 }, (_, i) => ({ x: Math.random() * WORLD.w, y: -80 - Math.random() * 120, v: 60 + Math.random() * 60, p: i * 1.3 }));
  const fogRooms = ROOMS.filter(r => ['jardim', 'porao', 'capela'].includes(r.id));
  PARTS.fog = fogRooms.flatMap(r => Array.from({ length: 6 }, () => ({ x: r.x + Math.random() * r.w, y: r.y + r.h * .5 + Math.random() * r.h * .5, r: 60 + Math.random() * 70, v: 8 + Math.random() * 10, room: r })));
}
function drawParticles() {
  if (!PARTS.dust.length) initParticles();
  const t = G.t;
  for (const f of PARTS.fog) { f.x += f.v * .016; if (f.x > f.room.x + f.room.w + f.r) f.x = f.room.x - f.r; const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r); g.addColorStop(0, 'rgba(200,190,230,.16)'); g.addColorStop(1, 'rgba(200,190,230,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,240,200,.55)';
  for (const d of PARTS.dust) { const px = d.x + Math.sin(t * .5 + d.p) * 18, py = d.y - ((t * d.v + d.p * 50) % 220) + 110; if (!inWalk(px, py)) continue; ctx.globalAlpha = .25 + .35 * Math.sin(t * 2 + d.p) ** 2; ctx.beginPath(); ctx.arc(px, py, d.s, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  for (const b of PARTS.bats) { b.x += b.v * .016; if (b.x > WORLD.w + 100) { b.x = -100; b.y = -80 - Math.random() * 120; } const wy = Math.sin(t * 14 + b.p) * 6, bx = b.x, by = b.y + Math.sin(t + b.p) * 20; ctx.beginPath(); ctx.moveTo(bx - 16, by + wy); ctx.quadraticCurveTo(bx - 8, by - 6, bx, by); ctx.quadraticCurveTo(bx + 8, by - 6, bx + 16, by + wy); ctx.quadraticCurveTo(bx + 8, by + 4, bx, by + 6); ctx.quadraticCurveTo(bx - 8, by + 4, bx - 16, by + wy); ctx.fill(); }
}
