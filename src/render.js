// ===== BRODS — desenho do mapa, decoração, luz e partículas =====

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

const bgStars = Array.from({ length: 90 }, () => ({ x: Math.random() * WORLD.w * 1.2 - 100, y: Math.random() * WORLD.h * 1.2 - 100, s: Math.random() * 2 + .5 }));

function drawMap() {
  const WALL = 26;
  // fundo externo (noite)
  ctx.fillStyle = '#0e0820'; ctx.fillRect(-2000, -2000, WORLD.w + 4000, WORLD.h + 4000);
  ctx.fillStyle = '#fff'; for (const s of bgStars) { ctx.globalAlpha = .5 + .5 * Math.sin(G.t * 2 + s.x); ctx.fillRect(s.x, s.y, s.s, s.s); } ctx.globalAlpha = 1;
  // lua
  ctx.fillStyle = '#f4efc2'; ctx.beginPath(); ctx.arc(WORLD.w - 120, -60, 70, 0, 7); ctx.fill(); ctx.fillStyle = '#0e0820'; ctx.beginPath(); ctx.arc(WORLD.w - 90, -80, 62, 0, 7); ctx.fill();
  // paredes (retângulos expandidos)
  for (const r of G.walk) { ctx.fillStyle = '#0a0614'; rr(r.x - WALL - 6, r.y - WALL - 6, r.w + 2 * WALL + 12, r.h + 2 * WALL + 12, 14); ctx.fill(); }
  for (const r of ROOMS) { ctx.fillStyle = r.wall; rr(r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL, 10); ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = stonePattern(); ctx.fillRect(r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL); ctx.restore(); }
  for (const c of CORRIDORS) { ctx.fillStyle = '#2a1f3a'; ctx.fillRect(c.x - WALL, c.y - WALL, c.w + 2 * WALL, c.h + 2 * WALL); }
  // chão
  for (const c of CORRIDORS) { ctx.fillStyle = '#4b3d5e'; ctx.fillRect(c.x, c.y, c.w, c.h); }
  for (const r of ROOMS) {
    const art = SPRITES['room_' + r.id];
    if (art) { ctx.drawImage(art, r.x, r.y, r.w, r.h); continue; }
    ctx.fillStyle = r.floor; ctx.fillRect(r.x, r.y, r.w, r.h);
    // tábuas
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let y = r.y + 40; y < r.y + r.h; y += 40) { ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); }
    ctx.stroke();
    // nome do cômodo
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.font = '900 22px Trebuchet MS, Arial'; ctx.textAlign = 'center'; ctx.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + r.h - 14);
  }
  // sombra interna no alto das paredes
  for (const r of ROOMS) { const g = ctx.createLinearGradient(0, r.y, 0, r.y + 28); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, 28); }
  // decorações (só nos cômodos sem arte)
  for (const d of DECOR) { const r = roomAt(d.x + 1, d.y + 1); if (r && SPRITES['room_' + r.id]) continue; drawDecor(d); }
  // passagens secretas (só marcam o chão; uso vem na fatia 3)
  for (const s of SECRET) { for (const [x, y] of [[s.ax, s.ay], [s.bx, s.by]]) { ctx.fillStyle = '#1b1226'; rr(x - 22, y - 16, 44, 32, 6); ctx.fill(); ctx.strokeStyle = '#3b2a50'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#3b2a50'; for (let i = -14; i <= 14; i += 7) ctx.fillRect(x + i - 1, y - 12, 2, 24); } }
  // estações de missão
  for (const m of visibleStations()) {
    const done = m.done;
    const pulse = done ? 0 : (Math.sin(G.t * 4) + 1) / 2;
    ctx.fillStyle = done ? 'rgba(31,191,107,.35)' : `rgba(255,211,0,${.25 + .25 * pulse})`;
    ctx.beginPath(); ctx.arc(m.x, m.y, 26 + pulse * 4, 0, 7); ctx.fill();
    ctx.strokeStyle = done ? '#1fbf6b' : '#ffd300'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(done ? '✔' : m.icon, m.x, m.y + 2); ctx.textBaseline = 'alphabetic';
  }
}

function drawDecor(d) {
  ctx.save();
  switch (d.type) {
    case 'window': ctx.fillStyle = '#0a0614'; rr(d.x, d.y, d.w, d.h, 6); ctx.fill(); ctx.strokeStyle = '#c9b98a'; ctx.lineWidth = 4; ctx.stroke(); ctx.beginPath(); ctx.moveTo(d.x + d.w / 2, d.y); ctx.lineTo(d.x + d.w / 2, d.y + d.h); ctx.moveTo(d.x, d.y + d.h / 2); ctx.lineTo(d.x + d.w, d.y + d.h / 2); ctx.stroke(); ctx.fillStyle = '#f4efc2'; ctx.beginPath(); ctx.arc(d.x + d.w * .7, d.y + d.h * .35, 7, 0, 7); ctx.fill(); break;
    case 'telescope': ctx.strokeStyle = '#c9b98a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(d.x, d.y + 40); ctx.lineTo(d.x + 40, d.y); ctx.stroke(); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(d.x, d.y + 40); ctx.lineTo(d.x - 14, d.y + 70); ctx.moveTo(d.x, d.y + 40); ctx.lineTo(d.x + 14, d.y + 70); ctx.stroke(); break;
    case 'chest': ctx.fillStyle = '#7a4a1e'; rr(d.x, d.y, 70, 46, 6); ctx.fill(); ctx.fillStyle = '#c9a227'; ctx.fillRect(d.x + 28, d.y + 18, 14, 14); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; rr(d.x, d.y, 70, 46, 6); ctx.stroke(); break;
    case 'boxes': ctx.fillStyle = '#a67c52'; ctx.fillRect(d.x, d.y, 50, 50); ctx.fillRect(d.x + 55, d.y + 10, 40, 40); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(d.x, d.y, 50, 50); ctx.strokeRect(d.x + 55, d.y + 10, 40, 40); break;
    case 'web': ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 40 + i * 13, d.y + 40); ctx.stroke(); } for (let r = 10; r < 40; r += 10) { ctx.beginPath(); ctx.arc(d.x, d.y, r, Math.PI * .5, Math.PI); ctx.stroke(); } break;
    case 'bed': ctx.fillStyle = '#8b1a1a'; rr(d.x, d.y, 110, 150, 8); ctx.fill(); ctx.fillStyle = '#fff'; rr(d.x + 10, d.y + 10, 90, 40, 8); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; rr(d.x, d.y, 110, 150, 8); ctx.stroke(); break;
    case 'rug': ctx.fillStyle = '#8d2b6d'; rr(d.x, d.y, d.w, d.h, 10); ctx.fill(); ctx.strokeStyle = '#e4b04a'; ctx.lineWidth = 3; rr(d.x + 8, d.y + 8, d.w - 16, d.h - 16, 6); ctx.stroke(); break;
    case 'painting': ctx.fillStyle = '#c9a227'; ctx.fillRect(d.x, d.y, 80, 60); ctx.fillStyle = d.c; ctx.fillRect(d.x + 8, d.y + 8, 64, 44); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d.x + 30, d.y + 30, 6, 0, 7); ctx.arc(d.x + 50, d.y + 30, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(d.x + 30 + Math.sin(G.t) * 2, d.y + 30, 3, 0, 7); ctx.arc(d.x + 50 + Math.sin(G.t) * 2, d.y + 30, 3, 0, 7); ctx.fill(); break;
    case 'shelf': ctx.fillStyle = '#4a2c12'; ctx.fillRect(d.x, d.y, d.w, 50); const cols = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#f1c40f']; for (let i = 0; i < d.w / 14 - 1; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(d.x + 6 + i * 14, d.y + 6, 10, 38); } ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(d.x, d.y, d.w, 50); break;
    case 'table': ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 60, 36, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#f4efc2'; ctx.fillRect(d.x - 14, d.y - 10, 28, 18); break;
    case 'stairs': for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#6b3d8a' : '#5a2f78'; ctx.fillRect(d.x, d.y + i * 16, 120, 16); } ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(d.x, d.y, 120, 80); ctx.fillStyle = '#b33'; ctx.fillRect(d.x + 50, d.y, 20, 80); break;
    case 'carpet': ctx.fillStyle = '#a8262f'; rr(d.x, d.y, d.w, d.h, 8); ctx.fill(); ctx.strokeStyle = '#e4b04a'; ctx.lineWidth = 4; rr(d.x + 10, d.y + 10, d.w - 20, d.h - 20, 6); ctx.stroke(); break;
    case 'button': ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(d.x, d.y, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#e0202a'; ctx.beginPath(); ctx.arc(d.x, d.y, 16, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '900 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('EMERGÊNCIA', d.x, d.y + 42); break;
    case 'candel': ctx.fillStyle = '#c9a227'; ctx.fillRect(d.x - 3, d.y, 6, 50); ctx.fillRect(d.x - 20, d.y + 10, 40, 5); for (const o of [-20, 0, 20]) { ctx.fillStyle = '#fff'; ctx.fillRect(d.x + o - 3, d.y - 10, 6, 20); ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.arc(d.x + o, d.y - 14 + Math.sin(G.t * 8 + o) * 1.5, 5, 0, 7); ctx.fill(); } break;
    case 'dtable': ctx.fillStyle = '#5a3a1e'; rr(d.x, d.y, 220, 90, 10); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; rr(d.x, d.y, 220, 90, 10); ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(d.x + 35 + i * 50, d.y + 45, 14, 0, 7); ctx.fill(); } break;
    case 'stove': ctx.fillStyle = '#555'; ctx.fillRect(d.x, d.y, 90, 50); ctx.fillStyle = '#111'; for (const o of [20, 65]) { ctx.beginPath(); ctx.arc(d.x + o, d.y + 25, 14, 0, 7); ctx.fill(); } ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(d.x, d.y, 90, 50); break;
    case 'cauldron': ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 40, 30, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6ad35a'; ctx.beginPath(); ctx.ellipse(d.x, d.y - 8, 30, 12, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(d.x, d.y, 40, 30, 0, 0, 7); ctx.stroke(); for (let i = 0; i < 3; i++) { const ph = (G.t * .8 + i * .7) % 1; ctx.fillStyle = `rgba(160,255,140,${1 - ph})`; ctx.beginPath(); ctx.arc(d.x - 15 + i * 15, d.y - 14 - ph * 40, 5 + ph * 6, 0, 7); ctx.fill(); } break;
    case 'knives': ctx.fillStyle = '#7a4a1e'; ctx.fillRect(d.x, d.y, 80, 14); ctx.fillStyle = '#ccc'; for (let i = 0; i < 4; i++) { ctx.fillRect(d.x + 10 + i * 18, d.y + 14, 5, 28); } break;
    case 'powerbox': ctx.fillStyle = '#666'; ctx.fillRect(d.x - 25, d.y - 30, 50, 60); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(d.x - 25, d.y - 30, 50, 60); ctx.fillStyle = '#ffd300'; ctx.font = '900 26px Arial'; ctx.textAlign = 'center'; ctx.fillText('⚡', d.x, d.y + 10); break;
    case 'barrel': ctx.fillStyle = '#7a4a1e'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 22, 28, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(d.x - 22, d.y - 8); ctx.lineTo(d.x + 22, d.y - 8); ctx.moveTo(d.x - 22, d.y + 8); ctx.lineTo(d.x + 22, d.y + 8); ctx.stroke(); break;
    case 'cage': ctx.strokeStyle = '#999'; ctx.lineWidth = 4; ctx.strokeRect(d.x, d.y, 100, 90); for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(d.x + i * 16, d.y); ctx.lineTo(d.x + i * 16, d.y + 90); ctx.stroke(); } ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '900 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('JAULA', d.x + 50, d.y + 108); break;
    case 'altar': ctx.fillStyle = '#ddd'; rr(d.x - 50, d.y, 100, 40, 6); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; rr(d.x - 50, d.y, 100, 40, 6); ctx.stroke(); ctx.fillStyle = '#c9a227'; ctx.fillRect(d.x - 4, d.y - 40, 8, 40); ctx.fillRect(d.x - 18, d.y - 30, 36, 8); break;
    case 'bench': ctx.fillStyle = '#5a3a1e'; rr(d.x, d.y, 110, 26, 5); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; rr(d.x, d.y, 110, 26, 5); ctx.stroke(); break;
    case 'bush': ctx.fillStyle = '#1f5a2a'; for (const [ox, oy, r] of [[0, 0, 30], [30, 10, 24], [-25, 12, 22]]) { ctx.beginPath(); ctx.arc(d.x + ox, d.y + oy, r, 0, 7); ctx.fill(); } break;
    case 'tomb': ctx.fillStyle = '#8a8a95'; rr(d.x, d.y, 44, 60, 14); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; rr(d.x, d.y, 44, 60, 14); ctx.stroke(); ctx.fillStyle = '#333'; ctx.font = '900 18px Arial'; ctx.textAlign = 'center'; ctx.fillText('✝', d.x + 22, d.y + 36); break;
    case 'gate': ctx.strokeStyle = '#333'; ctx.lineWidth = 5; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(d.x + i * 18, d.y); ctx.lineTo(d.x + i * 18, d.y + 70); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(d.x, d.y + 10); ctx.lineTo(d.x + 108, d.y + 10); ctx.moveTo(d.x, d.y + 55); ctx.lineTo(d.x + 108, d.y + 55); ctx.stroke(); break;
    case 'tree': ctx.fillStyle = '#3a2612'; ctx.fillRect(d.x - 8, d.y, 16, 60); ctx.fillStyle = '#1f5a2a'; ctx.beginPath(); ctx.arc(d.x, d.y - 10, 40, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke(); break;
    case 'bench2': ctx.fillStyle = '#446'; rr(d.x, d.y, d.w, 44, 6); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; rr(d.x, d.y, d.w, 44, 6); ctx.stroke(); break;
    case 'flasks': for (const [o, c] of [[0, '#e74c3c'], [22, '#3498db'], [44, '#2ecc71']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(d.x + o, d.y + 20, 10, 0, 7); ctx.fill(); ctx.fillRect(d.x + o - 4, d.y, 8, 16); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.x + o, d.y + 20, 10, 0, 7); ctx.stroke(); } break;
    case 'tank': ctx.fillStyle = 'rgba(120,220,255,.55)'; rr(d.x, d.y, 50, 110, 20); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; rr(d.x, d.y, 50, 110, 20); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 4; i++) { const ph = (G.t * .5 + i * .25) % 1; ctx.beginPath(); ctx.arc(d.x + 12 + i * 9, d.y + 100 - ph * 90, 3, 0, 7); ctx.fill(); } break;
  }
  ctx.restore();
}


// ---------- Textura de pedra das paredes ----------
let _stone = null;
function stonePattern() {
  if (_stone) return _stone;
  const c = document.createElement('canvas'); c.width = 64; c.height = 48; const x = c.getContext('2d');
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
  for (let row = 0; row < 3; row++) { const y = row * 16 + 8; x.beginPath(); x.moveTo(0, y); x.lineTo(64, y); x.stroke(); const off = row % 2 ? 16 : 0; for (let bx = off; bx < 64; bx += 32) { x.beginPath(); x.moveTo(bx, y - 8); x.lineTo(bx, y + 8); x.stroke(); } }
  x.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 12; i++) x.fillRect(Math.random() * 64, Math.random() * 48, 6, 3);
  _stone = ctx.createPattern(c, 'repeat'); return _stone;
}

// ---------- Iluminação (escuridão + luzes) ----------
const lightCanvas = document.createElement('canvas');
function lightSources() {
  const L = [];
  for (const d of DECOR) {
    if (d.type === 'candel') L.push({ x: d.x, y: d.y - 10, r: 190, c: '255,180,60', f: 1 });
    else if (d.type === 'window') L.push({ x: d.x + d.w / 2, y: d.y + d.h / 2, r: 220, c: '160,190,255', f: 0 });
    else if (d.type === 'cauldron') L.push({ x: d.x, y: d.y - 10, r: 170, c: '120,255,120', f: 1 });
    else if (d.type === 'tank') L.push({ x: d.x + 25, y: d.y + 55, r: 150, c: '120,200,255', f: 0 });
    else if (d.type === 'altar') L.push({ x: d.x, y: d.y - 20, r: 180, c: '255,200,90', f: 1 });
    else if (d.type === 'powerbox') L.push({ x: d.x, y: d.y, r: 120, c: '255,220,80', f: 1 });
    else if (d.type === 'stairs') L.push({ x: d.x + 60, y: d.y + 40, r: 260, c: '255,210,120', f: 0 });
  }
  return L;
}
let _lights = null;
function drawLighting() {
  if (!_lights) _lights = lightSources();
  const lc = lightCanvas; if (lc.width !== canvas.width || lc.height !== canvas.height) { lc.width = canvas.width; lc.height = canvas.height; }
  const x = lc.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
  x.fillStyle = G.dark ? 'rgba(4,0,14,.97)' : 'rgba(10,4,28,.55)'; x.fillRect(0, 0, lc.width, lc.height);
  const z = G.cam.zoom; x.setTransform(z, 0, 0, z, lc.width / 2 - G.cam.x * z, lc.height / 2 - G.cam.y * z);
  x.globalCompositeOperation = 'destination-out';
  const flick = .9 + Math.sin(G.t * 13) * .05 + Math.sin(G.t * 29) * .05;
  const spot = (lx, ly, r, a) => { const g = x.createRadialGradient(lx, ly, 0, lx, ly, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.5, `rgba(0,0,0,${a * .55})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(lx, ly, r, 0, 7); x.fill(); };
  if (!G.dark) for (const l of _lights) spot(l.x, l.y, l.r * (l.f ? flick : 1), .9);
  for (const m of visibleStations()) if (!m.done) spot(m.x, m.y, 90, .6);
  for (const e of G.entities) { if (!e.alive && e !== G.player) continue; if (e.swallowed) continue; spot(e.x, e.y - 20, G.dark ? (e === G.player ? 150 : 60) : 230, 1); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lc, 0, 0); ctx.restore();
  if (!G.dark) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const l of _lights) { const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * .6); g.addColorStop(0, `rgba(${l.c},${.22 * (l.f ? flick : 1)})`); g.addColorStop(1, `rgba(${l.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * .6, 0, 7); ctx.fill(); } ctx.restore(); }
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

