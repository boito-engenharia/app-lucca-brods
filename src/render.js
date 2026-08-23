// ===== BRODS — desenho do mapa (camada estática pré-renderizada), decoração, luz e partículas =====
'use strict';

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function rrPath(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function rrc(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
// ruído determinístico simples
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }

const bgStars = Array.from({ length: 90 }, () => ({ x: Math.random() * WORLD.w * 1.2 - 100, y: Math.random() * WORLD.h * 1.2 - 100, s: Math.random() * 2 + .5 }));

// ---------- Camada estática (chão + paredes + móveis fixos) ----------
let MAP_SCALE = 1.25;
let mapLayer = null, _ground = null;
function buildMapLayer() {
  MAP_SCALE = Math.max(.6, Math.min(1.6, G.cam.zoom));
  const c = document.createElement('canvas'); c.width = Math.ceil((WORLD.w + 200) * MAP_SCALE); c.height = Math.ceil((WORLD.h + 200) * MAP_SCALE);
  const x = c.getContext('2d'); x.scale(MAP_SCALE, MAP_SCALE); x.translate(100, 100);
  const WALL = 26;
  // fundo externo: textura de chão + estrelas + lua (estático)
  x.fillStyle = '#0e0820'; x.fillRect(-100, -100, WORLD.w + 200, WORLD.h + 200);
  if (SPRITES['room_fundo']) { x.save(); x.fillStyle = x.createPattern(SPRITES['room_fundo'], 'repeat'); x.scale(.5, .5); x.fillRect(-200, -200, (WORLD.w + 200) * 2, (WORLD.h + 200) * 2); x.restore(); }
  x.fillStyle = '#fff'; for (const st of bgStars) { x.globalAlpha = .4 + hash(st.x, st.y) * .6; x.fillRect(st.x, st.y, st.s, st.s); } x.globalAlpha = 1;
  { const gl = x.createRadialGradient(WORLD.w - 120, -60, 60, WORLD.w - 120, -60, 220); gl.addColorStop(0, 'rgba(244,239,194,.25)'); gl.addColorStop(1, 'rgba(244,239,194,0)'); x.fillStyle = gl; x.beginPath(); x.arc(WORLD.w - 120, -60, 220, 0, 7); x.fill(); x.fillStyle = '#f4efc2'; x.beginPath(); x.arc(WORLD.w - 120, -60, 70, 0, 7); x.fill(); x.fillStyle = '#0e0820'; x.beginPath(); x.arc(WORLD.w - 90, -80, 62, 0, 7); x.fill(); }
  // contorno externo grosso (sombra da casa)
  for (const r of G.walk) { x.fillStyle = '#07040f'; rrc(x, r.x - WALL - 8, r.y - WALL - 8, r.w + 2 * WALL + 16, r.h + 2 * WALL + 16, 16); x.fill(); }
  // paredes
  for (const r of ROOMS) { x.fillStyle = r.wall; rrc(x, r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL, 10); x.fill(); x.save(); x.clip(); x.fillStyle = stonePatternFor(x); x.fillRect(r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL); x.restore(); }
  for (const cr of CORRIDORS) { x.fillStyle = '#2a1f3a'; x.fillRect(cr.x - WALL, cr.y - WALL, cr.w + 2 * WALL, cr.h + 2 * WALL); x.save(); x.beginPath(); x.rect(cr.x - WALL, cr.y - WALL, cr.w + 2 * WALL, cr.h + 2 * WALL); x.clip(); x.fillStyle = stonePatternFor(x); x.fillRect(cr.x - WALL, cr.y - WALL, cr.w + 2 * WALL, cr.h + 2 * WALL); x.restore(); }
  // chão dos corredores: pedra escura com tapete vermelho no meio
  const corArt = SPRITES['room_corredor'];
  for (const cr of CORRIDORS) {
    if (corArt) { const horiz = cr.w > cr.h; x.save(); x.beginPath(); x.rect(cr.x, cr.y, cr.w, cr.h); x.clip(); x.filter = 'brightness(1.9) saturate(1.1)'; if (horiz) { x.translate(cr.x, cr.y + cr.h); x.rotate(-Math.PI / 2); const S = cr.h; for (let k = 0; k < cr.w; k += S) x.drawImage(corArt, 0, k, S, S); } else { const S = cr.w; for (let k = 0; k < cr.h; k += S) x.drawImage(corArt, cr.x, cr.y + k, S, S); } x.restore(); continue; }
    floorStone(x, cr.x, cr.y, cr.w, cr.h, '#3e3350', '#2a2238');
    const horiz = cr.w > cr.h;
    x.fillStyle = '#7a1f2a'; if (horiz) x.fillRect(cr.x, cr.y + cr.h * .3, cr.w, cr.h * .4); else x.fillRect(cr.x + cr.w * .3, cr.y, cr.w * .4, cr.h);
    x.strokeStyle = '#c9a227'; x.lineWidth = 2; if (horiz) { x.strokeRect(cr.x - 1, cr.y + cr.h * .3 + 4, cr.w + 2, cr.h * .4 - 8); } else { x.strokeRect(cr.x + cr.w * .3 + 4, cr.y - 1, cr.w * .4 - 8, cr.h + 2); }
  }
  // chão dos cômodos
  for (const r of ROOMS) {
    if (SPRITES['room_' + r.id]) continue;
    switch (r.id) {
      case 'biblioteca': case 'jantar': case 'quarto': case 'sotao': floorWood(x, r); break;
      case 'salao': case 'galeria': floorMarble(x, r); break;
      case 'torre': case 'porao': case 'capela': floorStone(x, r.x, r.y, r.w, r.h, r.floor, shade(r.floor, -25)); break;
      case 'cozinha': case 'laboratorio': floorTiles(x, r); break;
      case 'jardim': floorGrass(x, r); break;
      default: x.fillStyle = r.floor; x.fillRect(r.x, r.y, r.w, r.h);
    }
  }
  // arte dos cômodos (cobre chão + paredes) + anel de pedra contínuo + sombra interna
  for (const r of ROOMS) {
    const art = SPRITES['room_' + r.id]; if (!art) continue;
    x.save(); rrc(x, r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL, 14); x.clip();
    x.drawImage(art, r.x - WALL - 6, r.y - WALL - 6, r.w + 2 * WALL + 12, r.h + 2 * WALL + 12);
    x.restore();
    // anel externo de pedra (mesma parede dos corredores) — só a metade de fora
    x.save(); x.beginPath(); rrPath(x, r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL, 14); rrPath(x, r.x - 10, r.y - 10, r.w + 20, r.h + 20, 8); x.clip('evenodd');
    x.fillStyle = r.wall; x.fillRect(r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL); x.fillStyle = stonePatternFor(x); x.fillRect(r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL);
    x.restore();
    // sombra interna suave (funde a arte com o anel)
    x.save(); rrc(x, r.x - 10, r.y - 10, r.w + 20, r.h + 20, 8); x.clip();
    let g = x.createLinearGradient(0, r.y - 10, 0, r.y + 22); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(r.x - 10, r.y - 10, r.w + 20, 32);
    g = x.createLinearGradient(0, r.y + r.h - 22, 0, r.y + r.h + 10); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = g; x.fillRect(r.x - 10, r.y + r.h - 22, r.w + 20, 32);
    g = x.createLinearGradient(r.x - 10, 0, r.x + 22, 0); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(r.x - 10, r.y - 10, 32, r.h + 20);
    g = x.createLinearGradient(r.x + r.w - 22, 0, r.x + r.w + 10, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = g; x.fillRect(r.x + r.w - 22, r.y - 10, 32, r.h + 20);
    x.restore();
  }
  // corredores por cima da arte (abrem as portas)
  for (const cr of CORRIDORS) {
    if (corArt) { const horiz = cr.w > cr.h; x.save(); x.beginPath(); x.rect(cr.x, cr.y, cr.w, cr.h); x.clip(); x.filter = 'brightness(1.9) saturate(1.1)'; if (horiz) { x.translate(cr.x, cr.y + cr.h); x.rotate(-Math.PI / 2); const S = cr.h; for (let k = 0; k < cr.w; k += S) x.drawImage(corArt, 0, k, S, S); } else { const S = cr.w; for (let k = 0; k < cr.h; k += S) x.drawImage(corArt, cr.x, cr.y + k, S, S); } x.restore(); }
    else { floorStone(x, cr.x, cr.y, cr.w, cr.h, '#3e3350', '#2a2238'); const horiz = cr.w > cr.h; x.fillStyle = '#7a1f2a'; if (horiz) x.fillRect(cr.x, cr.y + cr.h * .3, cr.w, cr.h * .4); else x.fillRect(cr.x + cr.w * .3, cr.y, cr.w * .4, cr.h); }
    // sombra de porta nas pontas do corredor
    const horiz = cr.w > cr.h; let g;
    if (horiz) { g = x.createLinearGradient(cr.x, 0, cr.x + 30, 0); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cr.x, cr.y, 30, cr.h); g = x.createLinearGradient(cr.x + cr.w - 30, 0, cr.x + cr.w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = g; x.fillRect(cr.x + cr.w - 30, cr.y, 30, cr.h); }
    else { g = x.createLinearGradient(0, cr.y, 0, cr.y + 30); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cr.x, cr.y, cr.w, 30); g = x.createLinearGradient(0, cr.y + cr.h - 30, 0, cr.y + cr.h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = g; x.fillRect(cr.x, cr.y + cr.h - 30, cr.w, 30); }
  }
  // portas: batentes de pedra + transição suave do piso do corredor pra dentro do cômodo
  for (const cr of CORRIDORS) for (const r of ROOMS) {
    const x0 = Math.max(r.x, cr.x), x1 = Math.min(r.x + r.w, cr.x + cr.w), y0 = Math.max(r.y, cr.y), y1 = Math.min(r.y + r.h, cr.y + cr.h);
    if (x1 < x0 || y1 < y0) continue;
    const horiz = (x1 - x0) > (y1 - y0);   // abertura horizontal = corredor vertical
    x.save();
    if (horiz) {
      const dirIn = cr.y < r.y ? 1 : -1;      // corredor acima → entra para baixo
      const yEdge = dirIn > 0 ? r.y : r.y + r.h;
      // transição do piso (corredor “vaza” 26px pra dentro)
      const tg = x.createLinearGradient(0, yEdge, 0, yEdge + dirIn * 26); tg.addColorStop(0, 'rgba(40,30,50,.85)'); tg.addColorStop(1, 'rgba(40,30,50,0)'); x.fillStyle = tg; x.fillRect(x0, Math.min(yEdge, yEdge + dirIn * 26), x1 - x0, 26);
      const tg2 = x.createLinearGradient(0, yEdge, 0, yEdge + dirIn * 26); tg2.addColorStop(0, 'rgba(122,31,42,.55)'); tg2.addColorStop(1, 'rgba(122,31,42,0)'); x.fillStyle = tg2; x.fillRect(x0 + (x1 - x0) * .3, Math.min(yEdge, yEdge + dirIn * 26), (x1 - x0) * .4, 26);
      // batentes
      x.fillStyle = '#2a2140'; x.fillRect(x0 - 14, yEdge - 14, 14, 28); x.fillRect(x1, yEdge - 14, 14, 28); x.fillStyle = stonePatternFor(x); x.fillRect(x0 - 14, yEdge - 14, 14, 28); x.fillRect(x1, yEdge - 14, 14, 28);
      x.strokeStyle = '#0b0716'; x.lineWidth = 3; x.strokeRect(x0 - 14, yEdge - 14, 14, 28); x.strokeRect(x1, yEdge - 14, 14, 28);
    } else {
      const dirIn = cr.x < r.x ? 1 : -1; const xEdge = dirIn > 0 ? r.x : r.x + r.w;
      const tg = x.createLinearGradient(xEdge, 0, xEdge + dirIn * 26, 0); tg.addColorStop(0, 'rgba(40,30,50,.85)'); tg.addColorStop(1, 'rgba(40,30,50,0)'); x.fillStyle = tg; x.fillRect(Math.min(xEdge, xEdge + dirIn * 26), y0, 26, y1 - y0);
      const tg2 = x.createLinearGradient(xEdge, 0, xEdge + dirIn * 26, 0); tg2.addColorStop(0, 'rgba(122,31,42,.55)'); tg2.addColorStop(1, 'rgba(122,31,42,0)'); x.fillStyle = tg2; x.fillRect(Math.min(xEdge, xEdge + dirIn * 26), y0 + (y1 - y0) * .3, 26, (y1 - y0) * .4);
      x.fillStyle = '#2a2140'; x.fillRect(xEdge - 14, y0 - 14, 28, 14); x.fillRect(xEdge - 14, y1, 28, 14); x.fillStyle = stonePatternFor(x); x.fillRect(xEdge - 14, y0 - 14, 28, 14); x.fillRect(xEdge - 14, y1, 28, 14);
      x.strokeStyle = '#0b0716'; x.lineWidth = 3; x.strokeRect(xEdge - 14, y0 - 14, 28, 14); x.strokeRect(xEdge - 14, y1, 28, 14);
    }
    x.restore();
  }
  // rodapé / sombra interna das paredes (só sem arte)
  for (const r of ROOMS) {
    if (SPRITES['room_' + r.id]) continue;
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
  const T = 40, a = shade(r.floor, 6), b = shade(r.floor, -16);
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
    case 'sink': shadow(x, d.x + 40, d.y + 44, 44, 7); x.fillStyle = '#8a8f99'; rrc(x, d.x, d.y, 80, 42, 6); x.fill(); x.fillStyle = '#3a3f4a'; rrc(x, d.x + 8, d.y + 8, 64, 26, 6); x.fill(); x.fillStyle = 'rgba(120,200,255,.5)'; rrc(x, d.x + 10, d.y + 14, 60, 18, 5); x.fill(); x.fillStyle = '#ccc'; x.fillRect(d.x + 38, d.y - 12, 4, 20); x.fillRect(d.x + 30, d.y - 12, 20, 4); outlineRect(x, d.x, d.y, 80, 42, 6); break;
    case 'pantry': x.fillStyle = '#0b0716'; rrc(x, d.x - 22, d.y - 40, 44, 80, 4); x.fill(); x.fillStyle = '#5a3414'; rrc(x, d.x - 22, d.y - 40, 30, 80, 4); x.fill(); x.fillStyle = '#c9a227'; x.beginPath(); x.arc(d.x + 2, d.y, 3, 0, 7); x.fill(); outlineRect(x, d.x - 22, d.y - 40, 44, 80, 4); break;
    case 'pots': for (const [ox, oy, r, c] of [[0, 0, 14, '#444'], [30, 6, 11, '#555'], [56, -2, 13, '#3a3a3a']]) { shadow(x, d.x + ox, d.y + oy + 14, r, 4); x.fillStyle = c; x.beginPath(); x.arc(d.x + ox, d.y + oy, r, 0, 7); x.fill(); x.fillStyle = '#777'; x.beginPath(); x.arc(d.x + ox, d.y + oy, r * .55, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(d.x + ox, d.y + oy, r, 0, 7); x.stroke(); } break;
    case 'chair': shadow(x, d.x, d.y + 20, 16, 5); x.fillStyle = '#4a2a14'; rrc(x, d.x - 14, d.y - 14, 28, 30, 5); x.fill(); x.fillStyle = '#8b1a1a'; rrc(x, d.x - 10, d.y - 10, 20, 20, 4); x.fill(); outlineRect(x, d.x - 14, d.y - 14, 28, 30, 5); break;
    case 'fireplace': { x.fillStyle = '#2a2a33'; rrc(x, d.x - 40, d.y - 10, 80, 60, 4); x.fill(); x.fillStyle = '#555'; x.fillRect(d.x - 40, d.y - 10, 80, 10); x.fillStyle = '#111'; rrc(x, d.x - 26, d.y + 6, 52, 40, 4); x.fill(); x.fillStyle = '#5a3414'; x.fillRect(d.x - 18, d.y + 36, 12, 8); x.fillRect(d.x + 6, d.y + 36, 12, 8); outlineRect(x, d.x - 40, d.y - 10, 80, 60, 4); break; }
    case 'wardrobe': shadow(x, d.x + 45, d.y + 64, 48, 7); x.fillStyle = '#4a2a14'; rrc(x, d.x, d.y, 90, 62, 5); x.fill(); x.fillStyle = '#6b482a'; x.fillRect(d.x + 6, d.y + 6, 36, 50); x.fillRect(d.x + 48, d.y + 6, 36, 50); x.fillStyle = '#c9a227'; x.fillRect(d.x + 40, d.y + 30, 3, 8); x.fillRect(d.x + 47, d.y + 30, 3, 8); outlineRect(x, d.x, d.y, 90, 62, 5); break;
    case 'vanity': shadow(x, d.x, d.y + 36, 40, 6); x.fillStyle = '#5a3a1e'; rrc(x, d.x - 36, d.y, 72, 34, 5); x.fill(); x.fillStyle = '#c9a227'; rrc(x, d.x - 22, d.y - 34, 44, 34, 22); x.fill(); x.fillStyle = '#bfe6ff'; rrc(x, d.x - 18, d.y - 30, 36, 28, 18); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(d.x - 10, d.y - 26, 6, 18); outlineRect(x, d.x - 36, d.y, 72, 34, 5); break;
    case 'statue': shadow(x, d.x, d.y + 42, 24, 6); x.fillStyle = '#6f6f7a'; rrc(x, d.x - 22, d.y + 20, 44, 22, 4); x.fill(); x.fillStyle = '#9a9aa6'; x.beginPath(); x.ellipse(d.x, d.y, 14, 24, 0, 0, 7); x.fill(); x.beginPath(); x.arc(d.x, d.y - 28, 11, 0, 7); x.fill(); x.fillStyle = '#b8b8c4'; x.beginPath(); x.arc(d.x - 4, d.y - 31, 5, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(d.x, d.y, 14, 24, 0, 0, 7); x.stroke(); x.beginPath(); x.arc(d.x, d.y - 28, 11, 0, 7); x.stroke(); outlineRect(x, d.x - 22, d.y + 20, 44, 22, 4); break;
    case 'gbench': shadow(x, d.x + 45, d.y + 24, 46, 5); x.fillStyle = '#5a1a3a'; rrc(x, d.x, d.y, 90, 24, 8); x.fill(); x.fillStyle = '#8d2b6d'; rrc(x, d.x + 4, d.y + 4, 82, 12, 6); x.fill(); outlineRect(x, d.x, d.y, 90, 24, 8); break;
    case 'board': x.fillStyle = '#5a3414'; rrc(x, d.x - 54, d.y - 34, 108, 68, 4); x.fill(); x.fillStyle = '#1f3b2a'; x.fillRect(d.x - 48, d.y - 28, 96, 56); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; x.beginPath(); x.moveTo(d.x - 38, d.y - 14); x.lineTo(d.x - 10, d.y - 14); x.moveTo(d.x - 38, d.y); x.lineTo(d.x + 20, d.y); x.moveTo(d.x - 38, d.y + 14); x.lineTo(d.x + 2, d.y + 14); x.stroke(); x.beginPath(); x.arc(d.x + 28, d.y - 8, 10, 0, 7); x.stroke(); outlineRect(x, d.x - 54, d.y - 34, 108, 68, 4); break;
    case 'spiral': shadow(x, d.x, d.y + 4, 42, 30); x.fillStyle = '#2a2140'; x.beginPath(); x.arc(d.x, d.y, 40, 0, 7); x.fill(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.fillStyle = i % 2 ? '#5a4a7a' : '#4a3d6b'; x.beginPath(); x.moveTo(d.x, d.y); x.arc(d.x, d.y, 38, a, a + Math.PI / 4); x.closePath(); x.fill(); } x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.arc(d.x, d.y, 40, 0, 7); x.stroke(); x.fillStyle = '#c9a227'; x.beginPath(); x.arc(d.x, d.y, 6, 0, 7); x.fill(); break;
    case 'starmap': shadow(x, d.x, d.y + 24, 40, 7); x.fillStyle = '#5a3a1e'; rrc(x, d.x - 40, d.y - 20, 80, 44, 6); x.fill(); x.fillStyle = '#1b1a40'; rrc(x, d.x - 32, d.y - 14, 64, 32, 4); x.fill(); x.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(d.x - 28 + hash(i, 3) * 56, d.y - 10 + hash(4, i) * 24, 1.2 + hash(i, i) * 1.2, 0, 7); x.fill(); } outlineRect(x, d.x - 40, d.y - 20, 80, 44, 6); break;
    case 'owl': x.fillStyle = '#5a3414'; x.fillRect(d.x - 30, d.y + 8, 60, 5); x.fillStyle = '#6b4a2e'; x.beginPath(); x.ellipse(d.x, d.y - 6, 10, 13, 0, 0, 7); x.fill(); x.fillStyle = '#ffd300'; x.beginPath(); x.arc(d.x - 4, d.y - 10, 3, 0, 7); x.arc(d.x + 4, d.y - 10, 3, 0, 7); x.fill(); x.fillStyle = '#000'; x.beginPath(); x.arc(d.x - 4, d.y - 10, 1.3, 0, 7); x.arc(d.x + 4, d.y - 10, 1.3, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.ellipse(d.x, d.y - 6, 10, 13, 0, 0, 7); x.stroke(); break;
    case 'glass': { x.fillStyle = '#0b0716'; rrc(x, d.x - 16, d.y - 30, 32, 60, 16); x.fill(); const g = x.createLinearGradient(d.x, d.y - 30, d.x, d.y + 30); g.addColorStop(0, shade(d.c, 60)); g.addColorStop(1, d.c); x.fillStyle = g; rrc(x, d.x - 12, d.y - 26, 24, 52, 12); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.moveTo(d.x, d.y - 26); x.lineTo(d.x, d.y + 26); x.moveTo(d.x - 12, d.y); x.lineTo(d.x + 12, d.y); x.stroke(); outlineRect(x, d.x - 16, d.y - 30, 32, 60, 16);
      // luz colorida no chão
      const b = x.createLinearGradient(0, d.y + 30, 0, d.y + 150); b.addColorStop(0, d.c + 'aa'); b.addColorStop(1, d.c + '00'); x.fillStyle = b; x.beginPath(); x.moveTo(d.x - 14, d.y + 30); x.lineTo(d.x + 14, d.y + 30); x.lineTo(d.x + 40, d.y + 150); x.lineTo(d.x - 40, d.y + 150); x.closePath(); x.fill(); break; }
    case 'chains': x.strokeStyle = '#888'; x.lineWidth = 4; x.setLineDash([6, 4]); x.beginPath(); x.moveTo(d.x, d.y - 60); x.quadraticCurveTo(d.x + 20, d.y - 10, d.x + 10, d.y + 30); x.moveTo(d.x + 40, d.y - 60); x.quadraticCurveTo(d.x + 30, d.y - 20, d.x + 46, d.y + 20); x.stroke(); x.setLineDash([]); x.fillStyle = '#555'; x.beginPath(); x.arc(d.x + 10, d.y + 34, 8, 0, 7); x.arc(d.x + 46, d.y + 24, 8, 0, 7); x.fill(); break;
    case 'rat': x.fillStyle = '#555'; x.beginPath(); x.ellipse(d.x, d.y, 10, 6, 0, 0, 7); x.fill(); x.beginPath(); x.arc(d.x + 9, d.y - 1, 4, 0, 7); x.fill(); x.strokeStyle = '#555'; x.lineWidth = 2; x.beginPath(); x.moveTo(d.x - 10, d.y); x.quadraticCurveTo(d.x - 20, d.y - 6, d.x - 24, d.y + 4); x.stroke(); x.fillStyle = '#f55'; x.beginPath(); x.arc(d.x + 11, d.y - 2, 1.2, 0, 7); x.fill(); break;
    case 'fountain': shadow(x, d.x, d.y + 30, 50, 12); x.fillStyle = '#6f6a75'; x.beginPath(); x.ellipse(d.x, d.y, 48, 30, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(90,160,220,.8)'; x.beginPath(); x.ellipse(d.x, d.y, 38, 22, 0, 0, 7); x.fill(); x.fillStyle = '#8a8a95'; x.beginPath(); x.ellipse(d.x, d.y - 6, 12, 8, 0, 0, 7); x.fill(); x.fillRect(d.x - 4, d.y - 34, 8, 30); x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.ellipse(d.x, d.y, 48, 30, 0, 0, 7); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2; x.beginPath(); x.ellipse(d.x - 8, d.y - 2, 14, 6, 0, 0, 7); x.stroke(); break;
    case 'pumpkin': shadow(x, d.x, d.y + 12, 14, 4); x.fillStyle = '#e67e22'; x.beginPath(); x.ellipse(d.x, d.y, 14, 11, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 1.5; for (const o of [-6, 0, 6]) { x.beginPath(); x.ellipse(d.x + o, d.y, 4, 11, 0, 0, 7); x.stroke(); } x.fillStyle = '#2d5a27'; x.fillRect(d.x - 2, d.y - 15, 4, 6); x.fillStyle = '#000'; x.beginPath(); x.moveTo(d.x - 7, d.y - 3); x.lineTo(d.x - 3, d.y - 3); x.lineTo(d.x - 5, d.y + 1); x.fill(); x.beginPath(); x.moveTo(d.x + 3, d.y - 3); x.lineTo(d.x + 7, d.y - 3); x.lineTo(d.x + 5, d.y + 1); x.fill(); x.fillRect(d.x - 6, d.y + 4, 12, 2); x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.ellipse(d.x, d.y, 14, 11, 0, 0, 7); x.stroke(); break;
    case 'mirror': shadow(x, d.x, d.y + 40, 20, 5); x.fillStyle = '#c9a227'; rrc(x, d.x - 20, d.y - 36, 40, 76, 18); x.fill(); x.fillStyle = '#d9d9e6'; rrc(x, d.x - 15, d.y - 30, 30, 64, 14); x.fill(); x.fillStyle = 'rgba(120,120,160,.5)'; rrc(x, d.x - 15, d.y - 10, 30, 44, 14); x.fill(); x.fillStyle = '#fff'; x.fillRect(d.x - 8, d.y - 24, 4, 20); outlineRect(x, d.x - 20, d.y - 36, 40, 76, 18); break;
    case 'mannequin': shadow(x, d.x, d.y + 44, 16, 5); x.fillStyle = '#3a2612'; x.fillRect(d.x - 3, d.y + 10, 6, 34); x.fillRect(d.x - 14, d.y + 42, 28, 4); x.fillStyle = '#e8d8c0'; rrc(x, d.x - 16, d.y - 18, 32, 34, 10); x.fill(); x.beginPath(); x.arc(d.x, d.y - 28, 9, 0, 7); x.fill(); x.fillStyle = '#7a2ebe'; rrc(x, d.x - 16, d.y - 6, 32, 22, 6); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; rrc(x, d.x - 16, d.y - 18, 32, 34, 10); x.stroke(); x.beginPath(); x.arc(d.x, d.y - 28, 9, 0, 7); x.stroke(); break;
    case 'armor': shadow(x, d.x, d.y + 54, 20, 6); x.fillStyle = '#8a8f99'; rrc(x, d.x - 16, d.y - 10, 32, 44, 8); x.fill(); x.fillStyle = '#b8bcc6'; x.beginPath(); x.arc(d.x, d.y - 22, 12, 0, 7); x.fill(); x.fillStyle = '#333'; x.fillRect(d.x - 8, d.y - 24, 16, 5); x.fillStyle = '#8a8f99'; x.fillRect(d.x - 8, d.y + 32, 6, 22); x.fillRect(d.x + 2, d.y + 32, 6, 22); x.strokeStyle = '#000'; x.lineWidth = 2.5; rrc(x, d.x - 16, d.y - 10, 32, 44, 8); x.stroke(); x.beginPath(); x.arc(d.x, d.y - 22, 12, 0, 7); x.stroke(); x.strokeStyle = '#5a3414'; x.lineWidth = 4; x.beginPath(); x.moveTo(d.x + 22, d.y - 36); x.lineTo(d.x + 22, d.y + 50); x.stroke(); x.fillStyle = '#ccc'; x.beginPath(); x.moveTo(d.x + 22, d.y - 48); x.lineTo(d.x + 16, d.y - 34); x.lineTo(d.x + 28, d.y - 34); x.fill(); break;
    case 'lamp': shadow(x, d.x, d.y + 36, 12, 4); x.fillStyle = '#333'; x.fillRect(d.x - 2, d.y - 10, 4, 46); x.fillRect(d.x - 10, d.y + 32, 20, 4); x.fillStyle = '#c9a227'; rrc(x, d.x - 12, d.y - 30, 24, 22, 4); x.fill(); x.fillStyle = '#ffe6a0'; x.fillRect(d.x - 8, d.y - 26, 16, 14); outlineRect(x, d.x - 12, d.y - 30, 24, 22, 4); break;
    case 'pew2': shadow(x, d.x + 55, d.y + 28, 56, 6); x.fillStyle = '#4a2a14'; rrc(x, d.x, d.y, 110, 28, 5); x.fill(); x.fillStyle = '#6b482a'; x.fillRect(d.x + 3, d.y + 3, 104, 8); outlineRect(x, d.x, d.y, 110, 28, 5); break;
    case 'crate': shadow(x, d.x, d.y + 26, 26, 5); x.fillStyle = '#8a6238'; x.fillRect(d.x - 22, d.y - 22, 44, 44); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.strokeRect(d.x - 16, d.y - 16, 32, 32); x.beginPath(); x.moveTo(d.x - 22, d.y - 22); x.lineTo(d.x + 22, d.y + 22); x.stroke(); outlineRect(x, d.x - 22, d.y - 22, 44, 44, 3); break;
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
    case 'fireplace': { for (let i = 0; i < 3; i++) { const fy = d.y + 30 - Math.abs(Math.sin(G.t * 7 + i * 2)) * 14; const g = ctx.createRadialGradient(d.x - 10 + i * 10, fy, 0, d.x - 10 + i * 10, fy, 14); g.addColorStop(0, 'rgba(255,240,150,.95)'); g.addColorStop(.5, 'rgba(255,120,20,.7)'); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x - 10 + i * 10, fy, 14, 0, 7); ctx.fill(); } break; }
    case 'lamp': { const g = ctx.createRadialGradient(d.x, d.y - 20, 0, d.x, d.y - 20, 26); g.addColorStop(0, 'rgba(255,230,160,.6)'); g.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y - 20, 26, 0, 7); ctx.fill(); break; }
    case 'fountain': ctx.fillStyle = 'rgba(180,220,255,.7)'; for (let i = 0; i < 5; i++) { const ph = (G.t * .9 + i * .2) % 1; ctx.beginPath(); ctx.arc(d.x + Math.sin(i * 1.3) * ph * 16, d.y - 36 - Math.sin(ph * Math.PI) * 20 + ph * 30, 2.5, 0, 7); ctx.fill(); } break;
    case 'rat': { const ph = Math.sin(G.t * 6 + d.x); ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(d.x + 9, d.y - 1 + ph * .6, 4, 0, 7); ctx.fill(); break; }
  }
}

// ---------- área visível em coordenadas de mundo ----------
function viewRect(pad) { pad = pad || 0; const vw = canvas.width / G.cam.zoom, vh = canvas.height / G.cam.zoom; return { x: G.cam.x - vw / 2 - pad, y: G.cam.y - vh / 2 - pad, w: vw + pad * 2, h: vh + pad * 2 }; }
// ---------- drawMap: camada estática + dinâmicos ----------
function drawMap() {
  if (!mapLayer) buildMapLayer();
  const V = viewRect(40);
  // fundo externo (noite)
  ctx.fillStyle = '#0e0820'; ctx.fillRect(V.x, V.y, V.w, V.h);
  // camada estática (só a parte visível)
  { const sx = Math.max(0, (V.x + 100) * MAP_SCALE), sy = Math.max(0, (V.y + 100) * MAP_SCALE); const ex = Math.min(mapLayer.width, (V.x + V.w + 100) * MAP_SCALE), ey = Math.min(mapLayer.height, (V.y + V.h + 100) * MAP_SCALE); if (ex > sx && ey > sy) ctx.drawImage(mapLayer, sx, sy, ex - sx, ey - sy, sx / MAP_SCALE - 100, sy / MAP_SCALE - 100, (ex - sx) / MAP_SCALE, (ey - sy) / MAP_SCALE); }
  // partes animadas
  { const vw = canvas.width / G.cam.zoom / 2 + 200, vh = canvas.height / G.cam.zoom / 2 + 200; for (const d of DECOR) { if (Math.abs(d.x - G.cam.x) > vw || Math.abs(d.y - G.cam.y) > vh) continue; const r = roomAt(d.x + 1, d.y + 1); if (r && SPRITES['room_' + r.id]) continue; drawDecorLive(d); } }
  // portas trancadas
  for (const b of SAB.blocked) { ctx.fillStyle = '#3a2612'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.fillStyle = '#c9a227'; if (b.w > b.h) for (let i = 0; i < b.w; i += 24) ctx.fillRect(b.x + i + 8, b.y + 4, 6, 8); else for (let i = 0; i < b.h; i += 24) ctx.fillRect(b.x + 4, b.y + i + 8, 8, 6); }
  // alvos de sabotagem
  if (SAB.active && SAB.active.type === 'lights') { const p = SAB.POWER; ctx.fillStyle = `rgba(255,211,0,${.3 + .3 * Math.sin(G.t * 6)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffd300'; ctx.lineWidth = 3; ctx.stroke(); }
  if (SAB.active && SAB.active.type === 'ghosts') { const p = SAB.BELL; ctx.fillStyle = `rgba(255,60,60,${.3 + .3 * Math.sin(G.t * 8)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 80, 0, 7); ctx.fill(); ctx.strokeStyle = '#ff1a1a'; ctx.lineWidth = 3; ctx.stroke(); ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🔔', p.x, p.y + 14); }
  // estações de missão
  for (const m of visibleStations()) {
    const done = m.done; const pulse = (Math.sin(G.t * 4) + 1) / 2;
    // anel no chão
    ctx.strokeStyle = done ? 'rgba(31,191,107,.8)' : `rgba(255,211,0,${.55 + .35 * pulse})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(m.x, m.y + 8, 26, 12, 0, 0, 7); ctx.stroke();
    if (!done) { ctx.strokeStyle = `rgba(255,211,0,${.5 - pulse * .5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(m.x, m.y + 8, 30 + pulse * 14, 14 + pulse * 7, 0, 0, 7); ctx.stroke(); }
    // badge flutuante
    const by = m.y - 58 - pulse * 6;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(m.x, m.y + 8, 10, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = done ? '#1fbf6b' : '#ffd300'; ctx.beginPath(); ctx.arc(m.x, by, 17, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m.x - 6, by + 14); ctx.lineTo(m.x + 6, by + 14); ctx.lineTo(m.x, by + 22); ctx.closePath(); ctx.fillStyle = done ? '#1fbf6b' : '#ffd300'; ctx.fill(); ctx.stroke();
    ctx.font = '17px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(done ? '✔' : m.icon, m.x, by + 1); ctx.textBaseline = 'alphabetic';
  }
}

// ---------- Iluminação (escuridão + luzes) ----------
const lightCanvas = document.createElement('canvas');
const ART_LIGHTS = [
  { x: 1020, y: 520, r: 300, c: '255,190,90', f: 1 },   // lustre do salão
  { x: 2190, y: 630, r: 220, c: '120,255,120', f: 1 },  // caldeirão
  { x: 1690, y: 486, r: 240, c: '255,140,40', f: 1 },   // lareira do jantar
  { x: 1960, y: 990, r: 200, c: '255,150,60', f: 1 },   // lareira do laboratório
  { x: 800, y: 1010, r: 220, c: '255,210,120', f: 1 },  // altar
  { x: 690, y: 95, r: 160, c: '150,180,255', f: 0 },    // janela do sótão
  { x: 1310, y: 130, r: 180, c: '150,180,255', f: 0 },  // janela do quarto
  { x: 1860, y: 540, r: 150, c: '150,180,255', f: 0 },  // janela do jantar
  { x: 210, y: 95, r: 170, c: '150,180,255', f: 0 },    // janela da torre
  { x: 1800, y: 1000, r: 150, c: '150,180,255', f: 0 }, // janela do lab
  { x: 290, y: 975, r: 140, c: '255,220,80', f: 1 },    // caixa de força
  { x: 1440, y: 1090, r: 160, c: '140,180,255', f: 0 }, // fonte
  { x: 1540, y: 1000, r: 140, c: '255,160,60', f: 1 },  // cripta do jardim
];
function lightSources() {
  const L = [];
  const hasArt = ROOMS.some(r => SPRITES['room_' + r.id]);
  if (hasArt) { for (const l of ART_LIGHTS) L.push(l); }
  else for (const d of DECOR) {
    if (d.type === 'candel') L.push({ x: d.x, y: d.y - 10, r: 200, c: '255,180,60', f: 1 });
    else if (d.type === 'window') L.push({ x: d.x + d.w / 2, y: d.y + d.h + 40, r: 230, c: '160,190,255', f: 0 });
    else if (d.type === 'cauldron') L.push({ x: d.x, y: d.y - 10, r: 180, c: '120,255,120', f: 1 });
    else if (d.type === 'tank') L.push({ x: d.x + 25, y: d.y + 55, r: 160, c: '120,200,255', f: 0 });
    else if (d.type === 'altar') L.push({ x: d.x, y: d.y - 20, r: 190, c: '255,200,90', f: 1 });
    else if (d.type === 'powerbox') L.push({ x: d.x, y: d.y, r: 120, c: '255,220,80', f: 1 });
    else if (d.type === 'stairs') L.push({ x: d.x + 60, y: d.y + 40, r: 270, c: '255,210,120', f: 0 });
    else if (d.type === 'flasks') L.push({ x: d.x + 30, y: d.y + 20, r: 120, c: '200,120,255', f: 0 });
    else if (d.type === 'fireplace') L.push({ x: d.x, y: d.y + 30, r: 260, c: '255,140,40', f: 1 });
    else if (d.type === 'lamp') L.push({ x: d.x, y: d.y - 20, r: 170, c: '255,220,140', f: 1 });
    else if (d.type === 'glass') L.push({ x: d.x, y: d.y + 60, r: 150, c: d.c === '#e74c3c' ? '255,120,120' : '120,160,255', f: 0 });
  }
  // luz ambiente de cada cômodo (pra não ficar manchas pretas)
  for (const r of ROOMS) L.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, r: Math.hypot(r.w, r.h) * .62, c: '255,240,220', f: 0, amb: true });
  for (const c of CORRIDORS) L.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: Math.max(c.w, c.h) * .9, c: '255,240,220', f: 0, amb: true });
  return L;
}
let _lights = null;
const LS = .4;                       // escala da camada de luz
let lightStatic = null, glowStatic = null, lightStaticDark = null, _vign = null, _vignKey = '';
function spotOn(x, lx, ly, r, a) { const g = x.createRadialGradient(lx, ly, 0, lx, ly, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.5, `rgba(0,0,0,${a * .55})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(lx, ly, r, 0, 7); x.fill(); }
let spotSprite = null;
function spotFast(x, lx, ly, r, a) { if (!spotSprite) { spotSprite = document.createElement('canvas'); spotSprite.width = spotSprite.height = 256; const sx = spotSprite.getContext('2d'); const g = sx.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.5, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = g; sx.fillRect(0, 0, 256, 256); } x.globalAlpha = a; x.drawImage(spotSprite, lx - r, ly - r, r * 2, r * 2); x.globalAlpha = 1; }
let vignCanvas = null, vignKey2 = '';
function buildLightStatic() {
  if (!_lights) _lights = lightSources();
  // camada clara (luzes acesas): escuridão base com buracos das luzes fixas
  const hasArt = !!SPRITES['room_salao'];
  const mk = (dark) => {
    const c = document.createElement('canvas'); c.width = Math.ceil((WORLD.w + 400) * LS); c.height = Math.ceil((WORLD.h + 400) * LS);
    const x = c.getContext('2d'); x.scale(LS, LS); x.translate(200, 200);
    x.fillStyle = dark ? 'rgba(4,0,14,.97)' : (hasArt ? 'rgba(10,4,28,.24)' : 'rgba(10,4,28,.42)'); x.fillRect(-200, -200, WORLD.w + 400, WORLD.h + 400);
    if (!dark) { x.globalCompositeOperation = 'destination-out'; for (const l of _lights) spotOn(x, l.x, l.y, l.r, l.amb ? .75 : .9); }
    return c;
  };
  lightStatic = mk(false); lightStaticDark = mk(true);
  // brilho colorido das luzes (fixo)
  const g = document.createElement('canvas'); g.width = lightStatic.width; g.height = lightStatic.height;
  const gx = g.getContext('2d'); gx.scale(LS, LS); gx.translate(200, 200); gx.globalCompositeOperation = 'lighter';
  for (const l of _lights) { if (l.amb) continue; const gr = gx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * .6); gr.addColorStop(0, `rgba(${l.c},.22)`); gr.addColorStop(1, `rgba(${l.c},0)`); gx.fillStyle = gr; gx.beginPath(); gx.arc(l.x, l.y, l.r * .6, 0, 7); gx.fill(); }
  glowStatic = g;
}
function drawLighting() {
  if (!lightStatic) buildLightStatic();
  const lc = lightCanvas; const LW = Math.ceil(canvas.width * LS), LH = Math.ceil(canvas.height * LS);
  if (lc.width !== LW || lc.height !== LH) { lc.width = LW; lc.height = LH; }
  const x = lc.getContext('2d');
  const darkMe = G.dark && G.player && G.player.kind !== 'demom' && G.player.alive;
  const z = G.cam.zoom * LS;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, LW, LH);
  // fundo: fora do mundo também escuro
  x.fillStyle = darkMe ? 'rgba(4,0,14,.97)' : 'rgba(10,4,28,.3)'; x.fillRect(0, 0, LW, LH);
  x.setTransform(z, 0, 0, z, LW / 2 - G.cam.x * z, LH / 2 - G.cam.y * z);
  // estático (já com as luzes fixas recortadas)
  x.globalCompositeOperation = 'source-over';
  { const V = viewRect(20); const L = darkMe ? lightStaticDark : lightStatic; const sx = Math.max(0, (V.x + 200) * LS), sy = Math.max(0, (V.y + 200) * LS); const ex = Math.min(L.width, (V.x + V.w + 200) * LS), ey = Math.min(L.height, (V.y + V.h + 200) * LS); if (ex > sx && ey > sy) { x.clearRect(sx / LS - 200, sy / LS - 200, (ex - sx) / LS, (ey - sy) / LS); x.drawImage(L, sx, sy, ex - sx, ey - sy, sx / LS - 200, sy / LS - 200, (ex - sx) / LS, (ey - sy) / LS); } }
  // dinâmico (só o que está na tela) — sprite de luz, sem gradientes por frame
  x.globalCompositeOperation = 'destination-out';
  const V2 = viewRect(260);
  for (const m of visibleStations()) if (!m.done && Math.abs(m.x - G.cam.x) < V2.w / 2 && Math.abs(m.y - G.cam.y) < V2.h / 2) spotFast(x, m.x, m.y, 90, .6);
  for (const e of G.entities) { if (!e.alive && e !== G.player) continue; if (e.swallowed) continue; if (Math.abs(e.x - G.cam.x) > V2.w / 2 || Math.abs(e.y - G.cam.y) > V2.h / 2) continue; spotFast(x, e.x, e.y - 20, darkMe ? (e === G.player ? 150 : 60) : 240, 1); }
  if (SAB.active && SAB.active.type === 'lights') spotFast(x, SAB.POWER.x, SAB.POWER.y, 120, .8);
  // vinheta (cacheada em meia resolução, dentro da camada de luz)
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
  const key = LW + 'x' + LH;
  if (vignKey2 !== key) { vignCanvas = document.createElement('canvas'); vignCanvas.width = LW; vignCanvas.height = LH; const vx = vignCanvas.getContext('2d'); const vg = vx.createRadialGradient(LW / 2, LH / 2, Math.min(LW, LH) * .45, LW / 2, LH / 2, Math.max(LW, LH) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)'); vx.fillStyle = vg; vx.fillRect(0, 0, LW, LH); vignKey2 = key; }
  x.drawImage(vignCanvas, 0, 0);
  // compõe
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(lc, 0, 0, canvas.width, canvas.height); ctx.restore();
  // brilho colorido (fixo, com tremor global)
  if (!darkMe) { const V = viewRect(20); const sx = Math.max(0, (V.x + 200) * LS), sy = Math.max(0, (V.y + 200) * LS); const ex = Math.min(glowStatic.width, (V.x + V.w + 200) * LS), ey = Math.min(glowStatic.height, (V.y + V.h + 200) * LS); if (ex > sx && ey > sy) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .85 + Math.sin(G.t * 13) * .08 + Math.sin(G.t * 29) * .07; ctx.drawImage(glowStatic, sx, sy, ex - sx, ey - sy, sx / LS - 200, sy / LS - 200, (ex - sx) / LS, (ey - sy) / LS); ctx.restore(); } }
}

// ---------- Partículas: poeira, morcegos, névoa ----------
const PARTS = { dust: [], bats: [], fog: [] };
let fogSprite = null;
function initParticles() {
  // poeira só dentro dos cômodos (sem checar colisão por frame)
  PARTS.dust = Array.from({ length: 80 }, () => { const r = ROOMS[Math.floor(Math.random() * ROOMS.length)]; return { x: r.x + 20 + Math.random() * (r.w - 40), y: r.y + 120 + Math.random() * Math.max(10, r.h - 140), s: Math.random() * 1.6 + .6, p: Math.random() * 7, v: 6 + Math.random() * 10 }; });
  fogSprite = document.createElement('canvas'); fogSprite.width = fogSprite.height = 128; const fx = fogSprite.getContext('2d'); const fg = fx.createRadialGradient(64, 64, 0, 64, 64, 64); fg.addColorStop(0, 'rgba(200,190,230,.16)'); fg.addColorStop(1, 'rgba(200,190,230,0)'); fx.fillStyle = fg; fx.fillRect(0, 0, 128, 128);
  PARTS.bats = Array.from({ length: 5 }, (_, i) => ({ x: Math.random() * WORLD.w, y: -80 - Math.random() * 120, v: 60 + Math.random() * 60, p: i * 1.3 }));
  const fogRooms = ROOMS.filter(r => ['jardim', 'porao', 'capela'].includes(r.id));
  PARTS.fog = fogRooms.flatMap(r => Array.from({ length: 4 }, () => ({ x: r.x + Math.random() * r.w, y: r.y + r.h * .5 + Math.random() * r.h * .5, r: 60 + Math.random() * 70, v: 8 + Math.random() * 10, room: r })));
}
function drawParticles() {
  if (!PARTS.dust.length) initParticles();
  const t = G.t;
  // só o que está na tela
  const vw = canvas.width / G.cam.zoom / 2 + 150, vh = canvas.height / G.cam.zoom / 2 + 150, cx = G.cam.x, cy = G.cam.y;
  for (const f of PARTS.fog) { f.x += f.v * .016; if (f.x > f.room.x + f.room.w + f.r) f.x = f.room.x - f.r; if (Math.abs(f.x - cx) > vw || Math.abs(f.y - cy) > vh) continue; ctx.drawImage(fogSprite, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2); }
  ctx.fillStyle = 'rgba(255,240,200,.55)';
  for (const d of PARTS.dust) { const px = d.x + Math.sin(t * .5 + d.p) * 18, py = d.y - ((t * d.v + d.p * 50) % 100) + 50; if (Math.abs(px - cx) > vw || Math.abs(py - cy) > vh) continue; ctx.globalAlpha = .25 + .35 * Math.sin(t * 2 + d.p) ** 2; ctx.fillRect(px, py, d.s * 1.6, d.s * 1.6); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  for (const b of PARTS.bats) { b.x += b.v * .016; if (b.x > WORLD.w + 100) { b.x = -100; b.y = -80 - Math.random() * 120; } const wy = Math.sin(t * 14 + b.p) * 6, bx = b.x, by = b.y + Math.sin(t + b.p) * 20; ctx.beginPath(); ctx.moveTo(bx - 16, by + wy); ctx.quadraticCurveTo(bx - 8, by - 6, bx, by); ctx.quadraticCurveTo(bx + 8, by - 6, bx + 16, by + wy); ctx.quadraticCurveTo(bx + 8, by + 4, bx, by + 6); ctx.quadraticCurveTo(bx - 8, by + 4, bx - 16, by + wy); ctx.fill(); }
}
