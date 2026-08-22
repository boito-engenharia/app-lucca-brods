// ===== BRODS — motor do jogo (Fatia 1) =====
'use strict';

// ---------- Som simples (WebAudio, sem arquivos) ----------
const SFX = (() => {
  let ctx = null, enabled = true;
  const ensure = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ctx && ctx.state === 'suspended') ctx.resume(); };
  const tone = (f, dur, type = 'square', vol = .08, slide = 0) => {
    if (!enabled || !ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  };
  const lib = {
    tick: () => tone(880, .07, 'square', .05),
    bad: () => tone(160, .25, 'sawtooth', .06, -80),
    ok: () => { tone(523, .12, 'triangle', .08); setTimeout(() => tone(659, .12, 'triangle', .08), 110); setTimeout(() => tone(784, .22, 'triangle', .09), 220); },
    step: () => tone(120 + Math.random() * 40, .05, 'triangle', .025),
    open: () => tone(440, .12, 'triangle', .06, 200),
    win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .3, 'triangle', .1), i * 140)); },
  };
  return {
    unlock: ensure,
    play: (n) => { ensure(); if (lib[n]) lib[n](); },
    toggle: () => { enabled = !enabled; return enabled; },
    get enabled() { return enabled; },
  };
})();

// ---------- Sprites ----------
const SPRITES = {};
function loadSprites() {
  const keys = Object.keys(SPRITE_DATA);
  return Promise.all(keys.map(k => new Promise(res => {
    const im = new Image(); im.onload = () => { SPRITES[k] = im; res(); }; im.onerror = () => res(); im.src = SPRITE_DATA[k];
  })));
}
// Recolorir o VENUS (amarelo) para outra cor — usado nas outras cores de VENUS
function recolor(img, hue, sat = 1, light = 1) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 10) continue;
    let r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) continue;
    const dd = max - min, s = l > .5 ? dd / (2 - max - min) : dd / (max + min);
    let h; if (max === r) h = (g - b) / dd + (g < b ? 6 : 0); else if (max === g) h = (b - r) / dd + 2; else h = (r - g) / dd + 4; h *= 60;
    // só os tons amarelos/laranja do corpo (evita roxo da faixa, branco dos olhos, preto)
    if (!(h > 30 && h < 70 && s > .45 && l > .2)) continue;
    const nh = (hue % 360) / 360, ns = Math.min(1, s * sat), nl = Math.min(.95, l * light);
    const q = nl < .5 ? nl * (1 + ns) : nl + ns - nl * ns, pp = 2 * nl - q;
    const h2r = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return pp + (q - pp) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6; return pp; };
    p[i] = h2r(nh + 1 / 3) * 255; p[i + 1] = h2r(nh) * 255; p[i + 2] = h2r(nh - 1 / 3) * 255;
  }
  x.putImageData(d, 0, 0);
  return c;
}

// ---------- Estado ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');

const G = {
  running: false, paused: false, inMinigame: false,
  t: 0, last: 0,
  cam: { x: 0, y: 0, zoom: 1 },
  player: null,
  entities: [],
  missions: [],
  done: new Set(),
  nearMission: null,
  room: null,
  walk: [],
};

const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault(); onKey(e); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// Joystick
const joy = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 };
(() => {
  const zone = $('joystick'), base = $('joy-base'), knob = $('joy-knob');
  const R = 50;
  zone.addEventListener('pointerdown', e => {
    if (joy.active) return; joy.active = true; joy.id = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY; joy.dx = joy.dy = 0;
    base.classList.add('active'); base.style.left = (e.clientX - 65) + 'px'; base.style.top = (e.clientY - 65) + 'px'; base.style.bottom = 'auto';
    knob.style.transform = 'translate(0,0)'; zone.setPointerCapture(e.pointerId); SFX.unlock();
  });
  const move = e => { if (!joy.active || e.pointerId !== joy.id) return; let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const d = Math.hypot(dx, dy); if (d > R) { dx = dx / d * R; dy = dy / d * R; } joy.dx = dx / R; joy.dy = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  const end = e => { if (e.pointerId !== joy.id) return; joy.active = false; joy.dx = joy.dy = 0; base.classList.remove('active'); };
  zone.addEventListener('pointermove', move); zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
})();
$('btn-use').addEventListener('click', () => { SFX.unlock(); tryUse(); });

// ---------- Geometria ----------
function buildWalk() { G.walk = [...ROOMS.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h })), ...CORRIDORS]; }
function inWalk(x, y) { for (const r of G.walk) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true; return false; }
function canStand(x, y, rad) {
  // 8 pontos na borda do círculo precisam estar dentro da área andável
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) if (!inWalk(x + Math.cos(a) * rad, y + Math.sin(a) * rad)) return false;
  return true;
}
function roomAt(x, y) { for (const r of ROOMS) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r; return null; }

// ---------- Entidades ----------
function makeEntity(kind, x, y, opts = {}) {
  return { kind, x, y, vx: 0, vy: 0, rad: 16, speed: opts.speed || 190, facing: 'down', moving: false, anim: 0, color: opts.color || 'yellow', hue: opts.hue, name: opts.name || '', sprites: null, ...opts };
}
function spritesFor(ent) {
  if (ent.sprites) return ent.sprites;
  const base = ent.kind === 'demom' ? 'demom' : ent.kind === 'chefe' ? 'chefe' : 'venus';
  const S = { front: SPRITES[base + '_front'], back: SPRITES[base + '_back'], side: SPRITES[base + '_side'], run: SPRITES[base + '_run'], dead: SPRITES[base + '_dead'] };
  if (base === 'venus' && ent.hue !== undefined) { for (const k of Object.keys(S)) if (S[k]) S[k] = recolor(S[k], ent.hue, ent.sat, ent.light); }
  ent.sprites = S; return S;
}

// ---------- Jogo ----------
function newGame() {
  buildWalk();
  G.done = new Set(); G.missions = MISSIONS.slice();
  G.player = makeEntity('venus', 1020, 620, { name: 'Você' });
  G.entities = [G.player];
  G.running = true; G.paused = false; G.inMinigame = false; G.t = 0; G.last = performance.now();
  G.cam.x = G.player.x; G.cam.y = G.player.y;
  $('hud').classList.remove('hidden'); $('start').classList.add('hidden'); $('win').classList.add('hidden'); $('menu').classList.add('hidden');
  renderTaskList();
  toast('Bem-vindo à mansão! Complete as 12 missões.');
}

function update(dt) {
  const p = G.player;
  let ax = 0, ay = 0;
  if (keys['arrowleft'] || keys['a']) ax -= 1; if (keys['arrowright'] || keys['d']) ax += 1;
  if (keys['arrowup'] || keys['w']) ay -= 1; if (keys['arrowdown'] || keys['s']) ay += 1;
  if (joy.active) { ax += joy.dx; ay += joy.dy; }
  const mag = Math.hypot(ax, ay);
  if (mag > 1) { ax /= mag; ay /= mag; }
  p.moving = mag > .1;
  if (p.moving) {
    if (Math.abs(ax) > Math.abs(ay)) p.facing = ax < 0 ? 'left' : 'right'; else p.facing = ay < 0 ? 'up' : 'down';
    const nx = p.x + ax * p.speed * dt, ny = p.y + ay * p.speed * dt;
    if (canStand(nx, p.y, p.rad)) p.x = nx;
    if (canStand(p.x, ny, p.rad)) p.y = ny;
    p.anim += dt * 10;
    if (Math.floor(p.anim) !== Math.floor(p.anim - dt * 10) && Math.floor(p.anim) % 2 === 0) SFX.play('step');
  } else p.anim = 0;

  // câmera
  const zoom = G.cam.zoom;
  const vw = canvas.width / zoom, vh = canvas.height / zoom;
  let cx = p.x, cy = p.y;
  cx = Math.max(vw / 2 - 60, Math.min(WORLD.w - vw / 2 + 60, cx)); cy = Math.max(vh / 2 - 60, Math.min(WORLD.h - vh / 2 + 60, cy));
  G.cam.x += (cx - G.cam.x) * Math.min(1, dt * 8); G.cam.y += (cy - G.cam.y) * Math.min(1, dt * 8);

  // cômodo atual
  const r = roomAt(p.x, p.y);
  if (r !== G.room) { G.room = r; $('room-name').textContent = r ? r.name : 'Corredor'; }

  // missão próxima
  let near = null, best = 70;
  for (const m of G.missions) { if (G.done.has(m.id)) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < best) { best = d; near = m; } }
  if (near !== G.nearMission) {
    G.nearMission = near;
    $('prompt').classList.toggle('hidden', !near); $('btn-use').classList.toggle('ready', !!near);
    if (near) $('prompt-text').textContent = near.name;
  }
}

function tryUse() {
  if (!G.running || G.paused || G.inMinigame) return;
  const m = G.nearMission; if (!m) return;
  openMinigame(m);
}
function onKey(e) {
  const k = e.key.toLowerCase();
  if (k === 'e' || k === 'enter') { if (G.running && !G.inMinigame) tryUse(); }
  if (k === 'escape') { if (G.inMinigame) closeMinigame(); else if (G.running) togglePause(); }
}

// ---------- Minigame overlay ----------
function openMinigame(m) {
  G.inMinigame = true; SFX.play('open');
  $('mg-title').textContent = m.icon + ' ' + m.name;
  const body = $('mg-body'); body.innerHTML = '';
  $('minigame').classList.remove('hidden');
  MINIGAMES[m.id](body, () => { completeMission(m); closeMinigame(); });
}
function closeMinigame() { $('minigame').classList.add('hidden'); $('mg-body').innerHTML = ''; G.inMinigame = false; }
$('mg-close').addEventListener('click', closeMinigame);
function completeMission(m) {
  G.done.add(m.id); renderTaskList();
  toast('✔ ' + m.name);
  if (G.done.size >= G.missions.length) { setTimeout(() => { G.running = false; SFX.play('win'); $('win').classList.remove('hidden'); }, 700); }
}
function renderTaskList() {
  const ul = $('task-list'); ul.innerHTML = '';
  for (const m of G.missions) { const li = document.createElement('li'); li.textContent = ROOMS.find(r => r.id === m.room).name + ': ' + m.name; if (G.done.has(m.id)) li.classList.add('done'); ul.appendChild(li); }
  $('task-count').textContent = G.done.size + '/' + G.missions.length;
  $('task-fill').style.width = (100 * G.done.size / G.missions.length) + '%';
}
let toastT = null;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2200); }

// ---------- Menu / pausa ----------
function togglePause() { G.paused = !G.paused; $('menu').classList.toggle('hidden', !G.paused); }
$('btn-menu').addEventListener('click', () => { if (G.running) togglePause(); });
$('btn-resume').addEventListener('click', togglePause);
$('btn-restart').addEventListener('click', () => { newGame(); });
$('btn-again').addEventListener('click', () => { newGame(); });
$('btn-sound').addEventListener('click', () => { const on = SFX.toggle(); $('btn-sound').textContent = on ? '🔊' : '🔇'; });
$('btn-play').addEventListener('click', () => { SFX.unlock(); newGame(); });

// ---------- Desenho ----------
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr);
  // zoom: mostra ~900 unidades de largura no desktop, ~620 no celular
  const targetW = innerWidth < 700 ? 620 : 1000;
  G.cam.zoom = canvas.width / targetW;
}
window.addEventListener('resize', resize); resize();

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
  for (const r of ROOMS) { ctx.fillStyle = r.wall; rr(r.x - WALL, r.y - WALL, r.w + 2 * WALL, r.h + 2 * WALL, 10); ctx.fill(); }
  for (const c of CORRIDORS) { ctx.fillStyle = '#2a1f3a'; ctx.fillRect(c.x - WALL, c.y - WALL, c.w + 2 * WALL, c.h + 2 * WALL); }
  // chão
  for (const c of CORRIDORS) { ctx.fillStyle = '#4b3d5e'; ctx.fillRect(c.x, c.y, c.w, c.h); }
  for (const r of ROOMS) {
    ctx.fillStyle = r.floor; ctx.fillRect(r.x, r.y, r.w, r.h);
    // tábuas
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let y = r.y + 40; y < r.y + r.h; y += 40) { ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); }
    ctx.stroke();
    // nome do cômodo
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.font = '900 22px Trebuchet MS, Arial'; ctx.textAlign = 'center'; ctx.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + r.h - 14);
  }
  // decorações
  for (const d of DECOR) drawDecor(d);
  // passagens secretas (só marcam o chão; uso vem na fatia 3)
  for (const s of SECRET) { for (const [x, y] of [[s.ax, s.ay], [s.bx, s.by]]) { ctx.fillStyle = '#1b1226'; rr(x - 22, y - 16, 44, 32, 6); ctx.fill(); ctx.strokeStyle = '#3b2a50'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#3b2a50'; for (let i = -14; i <= 14; i += 7) ctx.fillRect(x + i - 1, y - 12, 2, 24); } }
  // estações de missão
  for (const m of G.missions) {
    const done = G.done.has(m.id);
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

function drawEntity(e) {
  const S = spritesFor(e);
  let img = S.front, flip = false;
  if (e.facing === 'up') img = S.back; else if (e.facing === 'left') img = S.side; else if (e.facing === 'right') { img = S.side; flip = true; }
  if (!img) { ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(e.x, e.y, 16, 0, 7); ctx.fill(); return; }
  const H = 64, W = img.width * (H / img.height);
  const bob = e.moving ? Math.abs(Math.sin(e.anim * 1.2)) * 5 : 0;
  const tilt = e.moving ? Math.sin(e.anim * 1.2) * .08 : 0;
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, 18, 8, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(e.x, e.y - bob); ctx.rotate(tilt); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -W / 2, -H + 6, W, H);
  ctx.restore();
  if (e.name) { ctx.font = '900 13px Trebuchet MS, Arial'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(e.name, e.x, e.y - H - 2); ctx.fillStyle = '#fff'; ctx.fillText(e.name, e.x, e.y - H - 2); }
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const z = G.cam.zoom;
  ctx.setTransform(z, 0, 0, z, canvas.width / 2 - G.cam.x * z, canvas.height / 2 - G.cam.y * z);
  drawMap();
  const ents = G.entities.slice().sort((a, b) => a.y - b.y);
  for (const e of ents) drawEntity(e);
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - G.last) / 1000); G.last = now;
  if (!G.running) return;
  G.t += dt;
  if (!G.paused && !G.inMinigame) update(dt);
  render();
}

// ---------- Boot ----------
loadSprites().then(() => {
  $('start-logo').src = SPRITE_DATA.logo_main;
  document.querySelectorAll('[data-sprite]').forEach(im => im.src = SPRITE_DATA[im.dataset.sprite]);
  G.last = performance.now();
  requestAnimationFrame(loop);
});
