// ===== BRODS — motor do jogo (Fatia 2) =====
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
  const noise = (dur, vol = .1) => { if (!enabled || !ctx) return; const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(ctx.destination); s.start(); };
  const lib = {
    tick: () => tone(880, .07, 'square', .05),
    bad: () => tone(160, .25, 'sawtooth', .06, -80),
    ok: () => { tone(523, .12, 'triangle', .08); setTimeout(() => tone(659, .12, 'triangle', .08), 110); setTimeout(() => tone(784, .22, 'triangle', .09), 220); },
    step: () => tone(120 + Math.random() * 40, .05, 'triangle', .025),
    open: () => tone(440, .12, 'triangle', .06, 200),
    win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .3, 'triangle', .1), i * 140)); },
    lose: () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, .35, 'sawtooth', .08), i * 180)); },
    kill: () => { noise(.25, .15); tone(90, .4, 'sawtooth', .12, -60); },
    swallow: () => { tone(300, .25, 'sine', .12, -200); setTimeout(() => tone(120, .3, 'sine', .1, 60), 200); },
    alarm: () => { for (let i = 0; i < 4; i++) setTimeout(() => tone(i % 2 ? 660 : 880, .18, 'square', .08), i * 200); },
    drum: () => { noise(.12, .2); tone(70, .2, 'sine', .2, -30); },
    eject: () => tone(600, .6, 'sine', .08, -500),
    teleport: () => { tone(300, .2, 'sine', .08, 900); },
    door: () => { if (!enabled || !ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(160 + Math.random() * 60, ctx.currentTime); o.frequency.linearRampToValueAtTime(110, ctx.currentTime + .4); f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(.04, ctx.currentTime); g.gain.linearRampToValueAtTime(.0001, ctx.currentTime + .45); o.connect(f); f.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .5); },
    bell: () => { [880, 1320, 1760].forEach((f, i) => tone(f, 1.2 - i * .2, 'sine', .06 / (i + 1))); },
    ghost: () => { tone(520, .8, 'sine', .05, -300); },
    lights: () => { noise(.3, .12); tone(200, .5, 'square', .05, -150); },
  };
  return { unlock: ensure, tone, play: (n) => { ensure(); if (lib[n]) lib[n](); }, toggle: () => { enabled = !enabled; MUSIC.setEnabled(enabled); return enabled; }, get enabled() { return enabled; } };
})();

// ---------- Sprites ----------
const SPRITES = {};
function loadSprites() {
  return Promise.all(Object.keys(SPRITE_DATA).map(k => new Promise(res => { const im = new Image(); im.onload = () => { SPRITES[k] = im; res(); }; im.onerror = () => res(); im.src = SPRITE_DATA[k]; })));
}
// Recolorir o VENUS (amarelo) para outra cor
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
    if (!(h > 30 && h < 70 && s > .45 && l > .2)) continue;
    const nh = (hue % 360) / 360, ns = Math.min(1, s * sat), nl = Math.min(.95, l * light);
    const q = nl < .5 ? nl * (1 + ns) : nl + ns - nl * ns, pp = 2 * nl - q;
    const h2r = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return pp + (q - pp) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6; return pp; };
    p[i] = h2r(nh + 1 / 3) * 255; p[i + 1] = h2r(nh) * 255; p[i + 2] = h2r(nh - 1 / 3) * 255;
  }
  x.putImageData(d, 0, 0); return c;
}
const _spriteCache = {};
function venusSprites(color) {
  const key = color.name;
  if (_spriteCache[key]) return _spriteCache[key];
  const S = {};
  for (const k of ['front', 'back', 'side', 'run', 'dead', 'atk', 'jump']) { const im = SPRITES['venus_' + k]; S[k] = (color.hue === undefined) ? im : recolor(im, color.hue, color.sat, color.light); }
  _spriteCache[key] = S; return S;
}
function trueSprites(kind) { return { front: SPRITES[kind + '_front'], back: SPRITES[kind + '_back'], side: SPRITES[kind + '_side'], run: SPRITES[kind + '_run'], dead: SPRITES[kind + '_dead'], atk: SPRITES[kind + '_atk'], jump: SPRITES[kind + '_jump'] }; }
const RUN_FACES_LEFT = { venus: false, demom: true, chefe: true };

// ---------- Estado ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
const $ = (id) => document.getElementById(id);
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');

const G = {
  phase: 'start', paused: false, inMinigame: false,
  t: 0, last: 0,
  cam: { x: 0, y: 0, zoom: 1 },
  player: null, entities: [], bodies: [],
  walk: [], dark: false, room: null,
  near: null,        // ação disponível: {type:'task'|'emergency'|'secret', ...}
  nearBody: null, nearTarget: null,
  emergenciesLeft: 1, meetingCd: 0,
  result: null,
};
const ROLE_INFO = {
  venus: { title: 'VENUS', goal: 'Execute as missões e expulse os assassinos', cls: 'venus' },
  demom: { title: 'DEMOM', goal: 'Mate e sabote para vencer — sem ser visto!', cls: 'demom' },
  chefe: { title: 'CHEFE', goal: 'Engula todos e sobreviva!', cls: 'chefe' },
};

const keys = {};
window.addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return; keys[e.key.toLowerCase()] = true; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault(); onKey(e); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// Joystick
const joy = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 };
(() => {
  const zone = $('joystick'), base = $('joy-base'), knob = $('joy-knob'); const R = 50;
  zone.addEventListener('pointerdown', e => { if (joy.active) return; joy.active = true; joy.id = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY; joy.dx = joy.dy = 0; base.classList.add('active'); base.style.left = (e.clientX - 65) + 'px'; base.style.top = (e.clientY - 65) + 'px'; base.style.bottom = 'auto'; knob.style.transform = 'translate(0,0)'; zone.setPointerCapture(e.pointerId); SFX.unlock(); });
  const move = e => { if (!joy.active || e.pointerId !== joy.id) return; let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const d = Math.hypot(dx, dy); if (d > R) { dx = dx / d * R; dy = dy / d * R; } joy.dx = dx / R; joy.dy = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  const end = e => { if (e.pointerId !== joy.id) return; joy.active = false; joy.dx = joy.dy = 0; base.classList.remove('active'); };
  zone.addEventListener('pointermove', move); zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
})();
$('btn-use').addEventListener('click', () => { SFX.unlock(); playerUse(); });
$('btn-report').addEventListener('click', () => { SFX.unlock(); playerReport(); });
$('btn-kill').addEventListener('click', () => { SFX.unlock(); playerKill(); });
$('btn-sab').addEventListener('click', () => { SFX.unlock(); openSabMenu(); });

// ---------- Geometria ----------
function buildWalk() { G.walk = [...ROOMS.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, id: r.id })), ...CORRIDORS.map((c, i) => ({ ...c, id: 'c' + i }))]; }
function inWalk(x, y) { for (const r of G.walk) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true; return false; }
function canStand(x, y, rad) { for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) { const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (!inWalk(px, py) || inBlocked(px, py)) return false; } return true; }
function roomAt(x, y) { for (const r of ROOMS) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r; return null; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function moveEntity(e, ax, ay, dt) {
  const mag = Math.hypot(ax, ay); if (mag > 1) { ax /= mag; ay /= mag; }
  e.moving = mag > .1;
  if (!e.moving) { e.anim = 0; return; }
  if (Math.abs(ax) > Math.abs(ay)) e.facing = ax < 0 ? 'left' : 'right'; else e.facing = ay < 0 ? 'up' : 'down';
  const nx = e.x + ax * e.speed * dt, ny = e.y + ay * e.speed * dt;
  if (e.ghost) { e.x = Math.max(-200, Math.min(WORLD.w + 200, nx)); e.y = Math.max(-200, Math.min(WORLD.h + 200, ny)); }
  else { if (canStand(nx, e.y, e.rad)) e.x = nx; if (canStand(e.x, ny, e.rad)) e.y = ny; }
  e.anim += dt * 10;
}

// ---------- Entidades ----------
let _eid = 0;
function makeEntity(kind, color, isBot) {
  return { id: ++_eid, kind, color, name: color.name, isBot, alive: true, ghost: false, swallowed: false, swallowT: 0, digested: false,
    x: 0, y: 0, rad: 16, speed: isBot ? SETTINGS.botSpeed : SETTINGS.playerSpeed, facing: 'down', moving: false, anim: 0,
    tasks: [], killCd: 0, revealT: 0, ai: { state: 'idle', path: [], wait: 0, target: null, lastRooms: [], witness: null, reported: false }, lastRoom: null, votes: 0 };
}
function spritesFor(e, trueForm) { if (trueForm && e.kind !== 'venus') { e._true = e._true || trueSprites(e.kind); return e._true; } e._sp = e._sp || venusSprites(e.color); return e._sp; }
function alive(e) { return e.alive && !e.swallowed; }
function countAlive(kind) { return G.entities.filter(e => alive(e) && e.kind === kind).length; }

// ---------- Nova partida ----------
function newGame() {
  buildWalk(); buildNav(); mapLayer = null; _lights = null;
  const N = SETTINGS.players = +$('players-range').value;
  // sorteio do papel do jogador (50% VENUS, 25% DEMOM, 25% CHEFE)
  const r = Math.random(); const myRole = r < .5 ? 'venus' : r < .75 ? 'demom' : 'chefe';
  const colors = VENUS_COLORS.slice();
  const ents = [];
  const me = makeEntity(myRole, colors.shift(), false); me.name = 'Você'; ents.push(me);
  const roles = []; const nDem = (N >= 10 && SETTINGS.demomCount >= 2) ? 2 : 1; for (let i = 0; i < nDem - (myRole === 'demom' ? 1 : 0); i++) roles.push('demom'); if (myRole !== 'chefe') roles.push('chefe'); while (roles.length < N - 1) roles.push('venus');
  // embaralha papéis dos bots
  for (let i = roles.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [roles[i], roles[j]] = [roles[j], roles[i]]; }
  roles.forEach(k => ents.push(makeEntity(k, colors.shift(), true)));
  // missões de cada VENUS (e de mentira para os vilões)
  for (const e of ents) { e.tasks = pickTasks(SETTINGS.tasksPerVenus).map(t => ({ id: t.id, done: false })); if (e.kind !== 'venus') e.killCd = 12; }
  // posições iniciais em círculo no Salão
  ents.forEach((e, i) => { const a = (i / ents.length) * Math.PI * 2; e.x = 1020 + Math.cos(a) * 120; e.y = 620 + Math.sin(a) * 90; });
  G.entities = ents; G.player = me; G.bodies = []; G.result = null; SAB.active = null; SAB.blocked = []; $('sab-banner').classList.add('hidden'); specialsReset(); G.votesAgainstMe = 0; G.firstEjectRole = null; G.myFirstVoteHit = false; G.usedLights = false; G.secretUses = 0; G.swallowCount = 0; G.medalShield = false; G.prints = [];
  G.emergenciesLeft = SETTINGS.emergencyPerPlayer; G.meetingCd = 10;
  G.t = 0; G.last = performance.now(); G.paused = false; G.inMinigame = false; G.dark = false; G.room = null;
  G.cam.x = me.x; G.cam.y = me.y;
  $('start').classList.add('hidden'); $('win').classList.add('hidden'); $('menu').classList.add('hidden'); $('ghost-note').classList.add('hidden');
  // revelação
  G.phase = 'reveal';
  const info = ROLE_INFO[myRole];
  $('reveal-img').src = SPRITE_DATA[myRole + '_front']; $('reveal-role').textContent = info.title; $('reveal-role').className = info.cls; $('reveal-goal').textContent = info.goal;
  $('reveal-mates').textContent = myRole === 'venus' ? `Há 1 DEMOM e 1 CHEFE escondidos entre os ${N - 1} outros. Eles parecem VENUS normais!` : 'Para os outros você parece um VENUS normal. Só você sabe quem é.';
  const touch = document.body.classList.contains('touch');
  const K = (k, t) => touch ? `<b>${t}</b>` : `<span class="key">${k}</span> ${t}`;
  $('reveal-controls').innerHTML = myRole === 'venus' ? `${K('E', 'USAR')} nas estações amarelas = missão<br>${K('R', 'REPORTAR')} perto de um corpo<br>Botão de emergência no Salão: ${K('E', 'USAR')}`
    : myRole === 'demom' ? `Chegue perto de alguém sozinho e aperte ${K('Q', 'MATAR')}<br>Espere a recarga · fuja pelas passagens secretas (${K('E', 'USAR')})<br>Na reunião: minta e acuse!`
    : `Chegue bem perto de alguém e aperte ${K('Q', 'ENGOLIR')}<br>Ele fica 60 s na sua barriga — não seja expulso!<br>Pode engolir até o DEMOM`;
  $('reveal').className = 'overlay ' + info.cls; $('reveal').classList.remove('hidden'); SFX.play(myRole === 'venus' ? 'ok' : 'kill');
  setTimeout(() => { $('reveal').classList.add('hidden'); G.phase = 'play'; $('hud').classList.remove('hidden'); setupHud(); G.hintT = 40; MUSIC.setMood(roleMood()); showHint(myRole === 'venus' ? 'Siga as estações amarelas e aperte E pra fazer a missão. Viu um corpo? Aperte R.' : myRole === 'demom' ? 'Você parece um VENUS. Chegue perto de alguém sozinho e aperte Q pra MATAR (recarga: 12 s).' : 'Você parece um VENUS. Chegue bem perto de alguém e aperte Q pra ENGOLIR (recarga: 12 s).'); }, 5200);
}
function roleMood() { const me = G.player; if (!me) return 'menu'; if (!me.alive) return 'dark'; if (SAB.active && (SAB.active.type === 'lights' || SAB.active.type === 'ghosts') && me.kind !== 'demom') return 'tense'; return me.kind === 'venus' ? 'calm' : 'villain'; }
function pickTasks(n) {
  const pool = TASKS.slice(); const out = []; const usedRooms = new Set();
  while (out.length < n && pool.length) {
    let cands = pool.filter(t => !usedRooms.has(t.room)); if (!cands.length) { usedRooms.clear(); cands = pool; }
    const t = cands[Math.floor(Math.random() * cands.length)]; out.push(t); usedRooms.add(t.room); pool.splice(pool.indexOf(t), 1);
  }
  return out;
}
function setupHud() {
  const me = G.player, info = ROLE_INFO[me.kind];
  $('role-banner').textContent = info.title; $('role-banner').className = info.cls;
  $('btn-kill').classList.toggle('hidden', me.kind === 'venus'); $('btn-kill').textContent = me.kind === 'chefe' ? 'ENGOLIR' : 'MATAR';
  $('btn-sab').classList.toggle('hidden', me.kind !== 'demom');
  $('cd-label').textContent = me.kind === 'chefe' ? 'ENGOLIR' : 'MATAR';
  renderTaskList();
}

// ---------- Loop de jogo ----------
function update(dt) {
  const me = G.player;
  // jogador
  let ax = 0, ay = 0;
  if (keys['arrowleft'] || keys['a']) ax -= 1; if (keys['arrowright'] || keys['d']) ax += 1;
  if (keys['arrowup'] || keys['w']) ay -= 1; if (keys['arrowdown'] || keys['s']) ay += 1;
  if (joy.active) { ax += joy.dx; ay += joy.dy; }
  if (!me.swallowed && !me.jailed) {
    const wasMoving = me.moving; moveEntity(me, ax, ay, dt);
    if (me.moving && Math.floor(me.anim) !== Math.floor(me.anim - dt * 10) && Math.floor(me.anim) % 2 === 0 && !me.ghost) SFX.play('step');
  }
  // câmera
  const vw = canvas.width / G.cam.zoom, vh = canvas.height / G.cam.zoom;
  let cx = Math.max(vw / 2 - 60, Math.min(WORLD.w - vw / 2 + 60, me.x)), cy = Math.max(vh / 2 - 60, Math.min(WORLD.h - vh / 2 + 60, me.y));
  G.cam.x += (cx - G.cam.x) * Math.min(1, dt * 8); G.cam.y += (cy - G.cam.y) * Math.min(1, dt * 8);
  const r = roomAt(me.x, me.y); if (r !== G.room) { if (r && G.room !== undefined && me.alive) SFX.play('door'); G.room = r; $('room-name').textContent = r ? r.name : 'Corredor'; }
  if (r) me.lastRoom = r.id;
  // cooldowns e timers
  G.meetingCd = Math.max(0, G.meetingCd - dt);
  for (const e of G.entities) { if (e.killCd > 0) e.killCd -= dt; if (e.revealT > 0) e.revealT -= dt; }
  // digestão
  for (const e of G.entities) if (e.swallowed && e.alive) { e.swallowT -= dt; if (e.swallowT <= 0) digest(e); }
  sabUpdate(dt); specialsUpdate(dt); printsUpdate(dt); fxUpdate(dt);
  // bots
  for (const e of G.entities) if (e.isBot && alive(e)) aiUpdate(e, dt);
  aiNoticeBodies(dt);
  // interações do jogador
  updatePlayerNear();
  updateCooldownHud();
}

function updatePlayerNear() {
  const me = G.player; let near = null;
  if (alive(me) && !me.ghost) {
    // estação de missão própria
    let best = 70;
    for (const t of me.tasks) { if (t.done) continue; const p = taskPos(TASK_BY_ID[t.id]); const d = Math.hypot(p.x - me.x, p.y - me.y); if (d < best) { best = d; near = { type: 'task', task: t, def: TASK_BY_ID[t.id], name: TASK_BY_ID[t.id].name }; } }
    if (!near) for (const sp of SPECIALS) { if (Math.hypot(sp.x - me.x, sp.y - me.y) < 60) { const label = specialAvailable(sp); if (label) near = { type: 'special', sp, name: label }; } }
    if (!near && SAB.active && SAB.active.type === 'lights' && me.kind !== 'demom' && Math.hypot(SAB.POWER.x - me.x, SAB.POWER.y - me.y) < 70) near = { type: 'power', name: 'Religar as luzes' };
    if (!near && Math.hypot(EMERGENCY.x - me.x, EMERGENCY.y - me.y) < 60) near = { type: 'emergency', name: SAB.active ? 'Botão travado (sabotagem)' : G.emergenciesLeft > 0 ? 'Botão de emergência' : 'Sem emergências' };
    if (!near && me.kind !== 'venus') for (const s of SECRET) { if (Math.hypot(s.ax - me.x, s.ay - me.y) < 50) near = { type: 'secret', to: { x: s.bx, y: s.by }, name: 'Passagem secreta' }; if (Math.hypot(s.bx - me.x, s.by - me.y) < 50) near = { type: 'secret', to: { x: s.ax, y: s.ay }, name: 'Passagem secreta' }; }
    // corpo
    G.nearBody = null; for (const b of G.bodies) if (Math.hypot(b.x - me.x, b.y - me.y) < 90) G.nearBody = b;
    // alvo
    G.nearTarget = null;
    if (me.kind !== 'venus') { let bd = 52; for (const e of G.entities) { if (e === me || !alive(e)) continue; const d = dist(e, me); if (d < bd) { bd = d; G.nearTarget = e; } } }
  } else { G.nearBody = null; G.nearTarget = null; }
  if ((near && near.name) !== (G.near && G.near.name)) { G.near = near; $('prompt').classList.toggle('hidden', !near); if (near) $('prompt-text').textContent = near.name; }
  else G.near = near;
  $('btn-use').classList.toggle('ready', !!near);
  $('btn-report').classList.toggle('ready', !!G.nearBody);
  $('btn-kill').classList.toggle('ready', !!G.nearTarget && me.killCd <= 0);
  $('btn-sab').classList.toggle('ready', canSabotage(me));
  // aviso de ação secundária (Q / R)
  const p2 = $('prompt2'); let p2k = null, p2t = '';
  if (G.nearBody) { p2k = 'R'; p2t = 'REPORTAR o corpo'; p2.classList.add('report'); }
  else if (G.nearTarget) { p2.classList.remove('report'); p2k = 'Q'; p2t = me.killCd > 0 ? (me.kind === 'chefe' ? 'ENGOLIR (carregando ' : 'MATAR (carregando ') + Math.ceil(me.killCd) + 's)' : (me.kind === 'chefe' ? 'ENGOLIR ' : 'MATAR ') + G.nearTarget.name; }
  if (p2k) { p2.classList.remove('hidden'); $('prompt2-key').textContent = p2k; $('prompt2-text').textContent = p2t; } else p2.classList.add('hidden');
  if (G.hintT > 0) { G.hintT -= 1 / 60; if (G.hintT <= 0) hideHint(); }
}
function updateCooldownHud() {
  const me = G.player;
  if (me.kind === 'venus' || !alive(me)) { $('cooldown').classList.add('hidden'); return; }
  $('cooldown').classList.remove('hidden');
  const belly = G.entities.filter(e => e.swallowed && e.alive);
  const max = me.kind === 'chefe' ? SETTINGS.swallowCooldown : SETTINGS.killCooldown; const pct = me.killCd > 0 ? Math.round(100 * (1 - me.killCd / max)) : 100;
  $('cd-ring').style.setProperty('--p', pct + '%'); $('cd-ring').classList.toggle('ready', me.killCd <= 0); $('cd-num').textContent = me.killCd > 0 ? Math.ceil(me.killCd) : 'OK';
  $('cd-val').textContent = me.killCd > 0 ? 'recarregando' : 'pronto' + (me.kind === 'chefe' && belly.length ? ` · barriga: ${belly.map(b => b.name + ' ' + Math.ceil(b.swallowT) + 's').join(', ')}` : '');
}

// ---------- Ações do jogador ----------
function playerUse() {
  if (G.phase !== 'play' || G.paused || G.inMinigame) return;
  const me = G.player, n = G.near; if (!n || !alive(me)) return;
  if (n.type === 'task') openMinigame(n.def, () => completeTask(me, n.task));
  else if (n.type === 'special') { if (n.sp.id === 'eyes' && SP.eyesCd > 0) return; useSpecial(n.sp); }
  else if (n.type === 'power') openMinigame({ icon: '⚡', name: 'Religar a caixa de força', game: 'toggleAll', p: { n: 6 } }, () => endSabotage('💡 As luzes voltaram!'));
  else if (n.type === 'emergency') { if (SAB.active) { toast('O botão não funciona durante a sabotagem!'); return; } if (G.emergenciesLeft > 0 && G.meetingCd <= 0) { G.emergenciesLeft--; startMeeting({ type: 'emergency', reporter: me }); } else toast(G.meetingCd > 0 ? 'Espere um pouco para usar o botão' : 'Você já usou sua emergência'); }
  else if (n.type === 'secret') { spawnFx(me.x, me.y - 20, '#ffffff', 12, 100, .6); me.x = n.to.x; me.y = n.to.y; spawnFx(me.x, me.y - 20, '#ffffff', 12, 100, .6); SFX.play('teleport'); G.secretUses = (G.secretUses || 0) + 1; me.jumpT = .5; }
}
function playerReport() { if (G.phase !== 'play' || G.paused || G.inMinigame) return; if (G.nearBody && alive(G.player)) startMeeting({ type: 'body', reporter: G.player, body: G.nearBody }); }
function playerKill() { if (G.phase !== 'play' || G.paused || G.inMinigame) return; const me = G.player; if (!alive(me) || me.kind === 'venus' || me.killCd > 0 || !G.nearTarget) return; if (me.kind === 'demom') killEntity(me, G.nearTarget); else swallowEntity(me, G.nearTarget); }
function onKey(e) {
  const k = e.key.toLowerCase();
  if (k === 'e' || k === 'enter') { if (G.phase === 'play' && !G.inMinigame) playerUse(); }
  if (k === 'r') playerReport();
  if (k === 'q') playerKill();
  if (k === 'f') openSabMenu();
  if (k === 'escape') { if (G.inMinigame) closeMinigame(); else if (G.phase === 'play') togglePause(); }
}

// ---------- Regras: matar, engolir, digerir, soltar ----------
function shakeAndFlash(strength, flash) { G.shake = Math.max(G.shake || 0, strength); if (flash) { const f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } }
function killEntity(killer, victim) {
  if (!alive(victim)) return;
  killer.killCd = SETTINGS.killCooldown; killer.revealT = 1.1; killer.atkDir = victim.x < killer.x ? 'left' : 'right';
  if (victim.shield) { victim.shield = false; SFX.play('bad'); if (victim === G.player) { toast('🧪 A Poção de Escudo te salvou!'); unlockMedal('shield'); } return; }
  recordDeath(victim, killer);
  spawnFx(victim.x, victim.y - 20, '#ff1a1a', 16, 140, .8); if (victim === G.player || (G.player.alive && Math.abs(victim.x - G.player.x) < 520 && Math.abs(victim.y - G.player.y) < 320)) shakeAndFlash(victim === G.player ? 14 : 6, victim === G.player);
  victim.alive = false; victim.ghost = true; victim.moving = false;
  G.bodies.push({ x: victim.x, y: victim.y, ent: victim, t: G.t, room: roomAt(victim.x, victim.y) });
  SFX.play('kill');
  if (victim === G.player) becomeGhost('O DEMOM pegou você!');
  if (victim.kind === 'chefe') releaseBelly(victim);
  aiOnKill(killer, victim);
  checkWin();
}
function swallowEntity(chefe, victim) {
  if (!alive(victim)) return;
  chefe.killCd = SETTINGS.swallowCooldown; chefe.revealT = 1.1; chefe.atkDir = victim.x < chefe.x ? 'left' : 'right';
  if (victim.shield) { victim.shield = false; SFX.play('bad'); if (victim === G.player) { toast('🧪 A Poção de Escudo te salvou do CHEFE!'); unlockMedal('shield'); } return; }
  recordDeath(victim, chefe); G.swallowCount = (G.swallowCount || 0) + (chefe === G.player ? 1 : 0);
  victim.swallowed = true; victim.swallowT = SETTINGS.digestTime; victim.moving = false; victim.vanishT = .5; victim.vx0 = victim.x; victim.vy0 = victim.y; victim.eater = chefe;
  spawnFx(victim.x, victim.y - 20, '#b98cff', 14, 120, .7); if (victim === G.player) shakeAndFlash(10, true);
  SFX.play('swallow');
  if (victim === G.player) { toast('O CHEFE engoliu você! Se ele for expulso ou morto em 60 s, você sai vivo…'); }
  aiOnKill(chefe, victim);
  checkWin();
}
function digest(victim) {
  victim.alive = false; victim.ghost = true; victim.digested = true; victim.swallowed = false;
  const chefe = G.entities.find(e => e.kind === 'chefe'); if (chefe) { victim.x = chefe.x; victim.y = chefe.y; }
  if (victim === G.player) becomeGhost('Você foi digerido pelo CHEFE…');
  checkWin();
}
function releaseBelly(chefe) {
  for (const e of G.entities) if (e.swallowed && e.alive) { e.swallowed = false; e.x = chefe.x + (Math.random() - .5) * 60; e.y = chefe.y + (Math.random() - .5) * 40; if (!canStand(e.x, e.y, e.rad)) { e.x = chefe.x; e.y = chefe.y; } if (e === G.player) toast('Você foi libertado da barriga do CHEFE!'); }
}
function becomeGhost(msg) { hideHint(); SFX.play('ghost'); MUSIC.setMood('dark'); toast(msg); $('ghost-note').classList.remove('hidden'); $('prompt').classList.add('hidden'); G.player.speed = 260; }

// ---------- Partículas de efeito ----------
G.fx = [];
function spawnFx(x, y, color, n, speed, life) { for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = speed * (.4 + Math.random()); G.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, life: life || .7, c: color, r: 3 + Math.random() * 4 }); } }
function fxUpdate(dt) { for (const f of G.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 120 * dt; } G.fx = G.fx.filter(f => f.t < f.life); for (const e of G.entities) { if (e.vanishT > 0) e.vanishT -= dt; if (e.jumpT > 0) e.jumpT -= dt; } }
function drawFx() { for (const f of G.fx) { const a = 1 - f.t / f.life; ctx.globalAlpha = a; ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * a + 1, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }

// ---------- Pegadas do DEMOM ----------
function printsUpdate(dt) {
  if (!SETTINGS.footprints) return;
  for (const e of G.entities) { if (e.kind !== 'demom' || !alive(e) || !e.moving) continue; e.printT = (e.printT || 0) + dt; if (e.printT > .35) { e.printT = 0; G.prints.push({ x: e.x + (Math.random() - .5) * 10, y: e.y + 2, t: G.t, a: e.facing }); } }
  G.prints = G.prints.filter(p => G.t - p.t < 6);
}
function drawPrints() { for (const p of G.prints) { const a = 1 - (G.t - p.t) / 6; ctx.fillStyle = `rgba(200,20,30,${a * .7})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 8, p.a === 'left' || p.a === 'right' ? Math.PI / 2 : 0, 0, 7); ctx.fill(); } }

// ---------- Missões ----------
function completeTask(e, t) {
  t.done = true; SFX.play('ok');
  if (e === G.player) { renderTaskList(); if (e.kind !== 'venus') toast('Missão de mentira feita (só disfarce)'); }
  else renderTaskList();
  checkWin();
}
function taskProgress() { let tot = 0, done = 0; for (const e of G.entities) { if (e.kind !== 'venus' || !e.alive) continue; for (const t of e.tasks) { tot++; if (t.done) done++; } } return { tot, done }; }
function visibleStations() { const me = G.player; if (!me) return []; return me.tasks.map(t => { const p = taskPos(TASK_BY_ID[t.id]); return { x: p.x, y: p.y, done: t.done, icon: TASK_BY_ID[t.id].icon }; }); }
function renderTaskList() {
  const me = G.player; const ul = $('task-list'); ul.innerHTML = '';
  const title = me.kind === 'venus' ? 'MISSÕES' : (innerWidth < 700 ? 'DISFARCE' : 'MISSÕES · DISFARCE');
  $('task-title').firstChild.textContent = title + ' ';
  for (const t of me.tasks) { const d = TASK_BY_ID[t.id]; const li = document.createElement('li'); li.textContent = ROOM_BY_ID[d.room].name + ': ' + d.name; if (t.done) li.classList.add('done'); ul.appendChild(li); }
  const p = taskProgress(); const pct = p.tot ? Math.round(100 * p.done / p.tot) : 0;
  $('task-count').textContent = pct + '%'; $('task-fill').style.width = pct + '%';
}

// ---------- Minigame overlay ----------
let _mgDone = null;
function openMinigame(def, onDone) {
  G.inMinigame = true; SFX.play('open'); _mgDone = onDone;
  $('mg-title').textContent = def.icon + ' ' + def.name;
  const body = $('mg-body'); body.innerHTML = ''; body._cleanup = null;
  $('minigame').classList.remove('hidden');
  MINIGAMES[def.game](body, () => { const f = _mgDone; _mgDone = null; closeMinigame(); if (f) f(); }, def.p || {});
}
function closeMinigame() { const body = $('mg-body'); if (body._cleanup) { try { body._cleanup(); } catch (e) { } } $('minigame').classList.add('hidden'); body.innerHTML = ''; G.inMinigame = false; _mgDone = null; }
$('mg-close').addEventListener('click', closeMinigame);
function showHint(msg) { const h = $('hint'); h.textContent = msg; h.classList.remove('hidden'); }
function hideHint() { $('hint').classList.add('hidden'); }
let toastT = null;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600); }

// ---------- Vitória ----------
function checkWin() {
  if (G.phase === 'end') return;
  const V = countAlive('venus'), D = countAlive('demom'), C = countAlive('chefe');
  const p = taskProgress();
  let winner = null;
  if (p.tot && p.done >= p.tot) winner = 'venus';
  else if (D === 0 && C === 0) winner = 'venus';
  else if (C === 1 && V === 0 && D === 0) winner = 'chefe';
  else if (D >= 1 && C === 0 && V <= D) winner = 'demom';
  if (winner) setTimeout(() => endGame(winner), 400);
}
function endGame(winner) {
  if (G.phase === 'end') return;
  G.phase = 'end'; closeMinigame(); $('meeting').classList.add('hidden'); $('eject').classList.add('hidden');
  const me = G.player; const iWon = me.kind === winner;
  MUSIC.stop(); SFX.play(iWon ? 'win' : 'lose'); checkMedalsEnd(winner);
  const names = { venus: 'VENUS VENCERAM!', demom: 'O DEMOM VENCEU!', chefe: 'O CHEFE VENCEU!' };
  $('win-title').textContent = names[winner]; $('win-title').className = winner;
  const p = taskProgress(); const reason = winner === 'venus' ? (p.tot && p.done >= p.tot ? 'Todas as missões foram concluídas.' : 'O DEMOM e o CHEFE foram eliminados.') : winner === 'demom' ? (G.result === 'ghosts' ? 'Os fantasmas tomaram a mansão.' : 'Sobraram poucos VENUS para resistir.') : 'O CHEFE engoliu e sobreviveu a todos.';
  $('win-sub').textContent = (iWon ? '🎉 Você venceu! ' : 'Você perdeu desta vez… ') + reason;
  $('win-hero').src = SPRITE_DATA[winner + '_front'];
  const ro = $('win-roster'); ro.innerHTML = '';
  for (const e of G.entities) { const d = document.createElement('div'); d.className = 'mp'; const c = avatarCanvas(e, true); d.appendChild(c); const n = document.createElement('span'); n.className = 'nm'; n.textContent = e.name + ' — '; const rl = document.createElement('span'); rl.className = 'role-' + e.kind; rl.textContent = ROLE_INFO[e.kind].title + (e.alive ? '' : ' ☠'); n.appendChild(rl); d.appendChild(n); ro.appendChild(d); }
  $('win').classList.remove('hidden');
  const cf = $('confetti'); cf.innerHTML = ''; if (iWon) { const cols = ['#1fbf6b', '#ffd300', '#ff1a1a', '#b98cff', '#fff']; for (let i = 0; i < 70; i++) { const d = document.createElement('i'); d.style.left = Math.random() * 100 + '%'; d.style.background = cols[i % cols.length]; d.style.animationDuration = (2.5 + Math.random() * 2.5) + 's'; d.style.animationDelay = (Math.random() * 1.5) + 's'; d.style.transform = `rotate(${Math.random() * 360}deg)`; cf.appendChild(d); } }
}
function avatarCanvas(e, trueForm) {
  const c = document.createElement('canvas'); c.width = 72; c.height = 72; const x = c.getContext('2d');
  const S = spritesFor(e, trueForm); const img = S.front; if (img) { const h = 68, w = img.width * (h / img.height); x.drawImage(img, (72 - w) / 2, 2, w, h); }
  return c;
}

// ---------- Menu / pausa ----------
function togglePause() { G.paused = !G.paused; $('menu').classList.toggle('hidden', !G.paused); }
$('btn-menu').addEventListener('click', () => { if (G.phase === 'play') togglePause(); });
$('btn-resume').addEventListener('click', togglePause);
$('btn-restart').addEventListener('click', () => { G.paused = false; $('menu').classList.add('hidden'); $('hud').classList.add('hidden'); $('start').classList.remove('hidden'); G.phase = 'start'; });
$('btn-again').addEventListener('click', () => { MUSIC.setMood('menu'); $('win').classList.add('hidden'); $('hud').classList.add('hidden'); $('start').classList.remove('hidden'); G.phase = 'start'; });
$('btn-sound').addEventListener('click', () => { const on = SFX.toggle(); $('btn-sound').textContent = on ? '🔊' : '🔇'; });
$('btn-play').addEventListener('click', () => { SFX.unlock(); MUSIC.setMood('menu'); newGame(); });
$('btn-settings').addEventListener('click', () => { SFX.unlock(); openSettings(); });
$('btn-settings-close').addEventListener('click', () => { $('settings').classList.add('hidden'); renderCrowd(); });
$('btn-medals').addEventListener('click', () => { SFX.unlock(); openMedals(); });
$('btn-win-medals').addEventListener('click', () => { openMedals(); });
$('btn-medals-close').addEventListener('click', () => { $('medals').classList.add('hidden'); });
$('btn-how').addEventListener('click', () => { SFX.unlock(); MUSIC.setMood('menu'); $('how').classList.remove('hidden'); });
$('btn-how-close').addEventListener('click', () => { $('how').classList.add('hidden'); });
function renderCrowd() { const n = +$('players-range').value; $('players-val').textContent = n; const c = $('crowd'); c.innerHTML = ''; for (let i = 0; i < n; i++) { const d = document.createElement('i'); const col = i === 0 ? '#ffd300' : VENUS_COLORS[i % VENUS_COLORS.length].css; d.style.background = col; c.appendChild(d); } }
$('players-range').addEventListener('input', renderCrowd); renderCrowd();

// ---------- Desenho ----------
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr);
  const small = innerWidth < 700 || innerHeight < 500; const tw = small ? 640 : 1000, th = small ? 760 : 620; G.cam.zoom = Math.max(canvas.width / tw, canvas.height / th);
}
window.addEventListener('resize', resize); resize();

function drawEntity(e) {
  const me = G.player;
  if (e.swallowed) { if (e.vanishT > 0 && e.eater) { const k = 1 - e.vanishT / .5; const img = spritesFor(e, false).front; if (img) { const x = e.vx0 + (e.eater.x - e.vx0) * k, y = e.vy0 + (e.eater.y - e.vy0) * k, H = 64 * (1 - k * .9), W = img.width * (H / img.height); ctx.save(); ctx.translate(x, y); ctx.rotate(k * 6); ctx.drawImage(img, -W / 2, -H + 6, W, H); ctx.restore(); } } return; }
  if (!e.alive && !e.jailed) { if (e !== me && !me.ghost) return; }   // fantasmas só aparecem pra quem é fantasma
  const trueForm = (e === me && e.kind !== 'venus') || e.revealT > 0;
  const S = spritesFor(e, trueForm);
  let img = S.front, flip = false, scale = 1;
  const attacking = e.revealT > .6 && e.kind !== 'venus' && S.atk;
  if (attacking) { img = S.atk; flip = e.atkDir === 'left'; scale = 1.12; }
  else if (e.jumpT > 0 && S.jump) { img = S.jump; scale = 1.1; }
  else if (e.facing === 'up') img = S.back;
  else if (e.facing === 'left' || e.facing === 'right') {
    const runFrame = e.moving && S.run && Math.floor(e.anim * .9) % 2 === 1;
    if (runFrame) { img = S.run; const runLeft = RUN_FACES_LEFT[e.kind === 'venus' || !trueForm ? 'venus' : e.kind]; flip = (e.facing === 'left') !== runLeft; }
    else { img = S.side; flip = e.facing === 'right'; }
  }
  if (!img) return;
  const H = 64 * scale, W = img.width * (H / img.height);
  const bob = e.moving && !attacking ? Math.abs(Math.sin(e.anim * 1.2)) * 5 : 0, tilt = e.moving && !attacking ? Math.sin(e.anim * 1.2) * .08 : 0;
  ctx.save();
  if (!e.alive && !e.jailed) { ctx.globalAlpha = .55; ctx.shadowColor = '#8ab4ff'; ctx.shadowBlur = 22; }
  else { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, 18, 8, 0, 0, 7); ctx.fill(); }
  const floatY = (e.alive || e.jailed) ? 0 : Math.sin(G.t * 2 + e.id) * 6 - 14;
  const jumpY = e.jumpT > 0 ? Math.sin((e.jumpT / .5) * Math.PI) * 30 : 0;
  ctx.translate(e.x, e.y - bob + floatY - jumpY); ctx.rotate(tilt); if (flip) ctx.scale(-1, 1);
  if (e.revealT > 0 && e.kind !== 'venus') { ctx.shadowColor = e.kind === 'demom' ? '#ff1a1a' : '#b98cff'; ctx.shadowBlur = 30; }
  ctx.drawImage(img, -W / 2, -H + 6, W, H);
  ctx.restore();
  // nome
  ctx.font = '900 13px Trebuchet MS, Arial'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(e.name, e.x, e.y - H - 2 + floatY); ctx.fillStyle = e === me ? '#fff' : e.color.css; ctx.fillText(e.name + (e.shield ? ' 🟣' : '') + (e.jailed ? ' 🔒' : ''), e.x, e.y - H - 2 + floatY);
  // barriga do chefe (visível só pra ele mesmo)
  if (e === me && e.kind === 'chefe') { const n = G.entities.filter(z => z.swallowed && z.alive).length; if (n) { ctx.fillStyle = '#b98cff'; ctx.beginPath(); ctx.arc(e.x + 22, e.y - 50, 11, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = '900 13px Arial'; ctx.fillText(String(n), e.x + 22, e.y - 45); } }
}
function drawBody(b) {
  const S = spritesFor(b.ent, false); const img = S.dead; if (!img) return;
  const age = G.t - b.t, k = Math.min(1, age / .35);
  const W = 70 * (1.35 - .35 * k), H = img.height * (W / img.width);
  ctx.fillStyle = `rgba(120,0,40,${.55 * k})`; ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, 40 * k, 16 * k, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(b.x, b.y + 10 - (1 - k) * 30); ctx.rotate((1 - k) * .6); ctx.drawImage(img, -W / 2, -H, W, H); ctx.restore();
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  const z = G.cam.zoom; let sx = 0, sy = 0; if (G.shake > 0) { sx = (Math.random() - .5) * G.shake * z; sy = (Math.random() - .5) * G.shake * z; G.shake *= .85; if (G.shake < .3) G.shake = 0; }
  ctx.setTransform(z, 0, 0, z, canvas.width / 2 - G.cam.x * z + sx, canvas.height / 2 - G.cam.y * z + sy); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  drawMap(); drawSpecials(); drawPrints();
  for (const b of G.bodies) drawBody(b);
  const ents = G.entities.slice().sort((a, b) => a.y - b.y);
  for (const e of ents) drawEntity(e);
  drawFx();
  drawParticles();
  drawLighting();
}
// ---------- Minimapa ----------
function drawMinimap() {
  const mc = $('minimap'); if (!mc) return; const x = mc.getContext('2d'); const W = mc.width, H = mc.height;
  x.clearRect(0, 0, W, H); const sx = (W - 8) / WORLD.w, sy = (H - 8) / WORLD.h; const sc = Math.min(sx, sy); const ox = (W - WORLD.w * sc) / 2, oy = (H - WORLD.h * sc) / 2;
  const me = G.player;
  for (const c of CORRIDORS) { x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(ox + c.x * sc, oy + c.y * sc, c.w * sc, c.h * sc); }
  for (const r of ROOMS) { x.fillStyle = (G.room === r) ? 'rgba(255,211,0,.55)' : 'rgba(255,255,255,.28)'; x.fillRect(ox + r.x * sc, oy + r.y * sc, r.w * sc, r.h * sc); }
  if (SAB.active && SAB.active.type === 'lights') { x.fillStyle = '#ffd300'; x.beginPath(); x.arc(ox + SAB.POWER.x * sc, oy + SAB.POWER.y * sc, 3, 0, 7); x.fill(); }
  if (SAB.active && SAB.active.type === 'ghosts') { x.fillStyle = '#ff1a1a'; x.beginPath(); x.arc(ox + SAB.BELL.x * sc, oy + SAB.BELL.y * sc, 3 + Math.sin(G.t * 8), 0, 7); x.fill(); }
  for (const m of visibleStations()) if (!m.done) { x.fillStyle = '#ffd300'; x.fillRect(ox + m.x * sc - 2, oy + m.y * sc - 2, 4, 4); }
  if (me) { x.fillStyle = '#fff'; x.beginPath(); x.arc(ox + me.x * sc, oy + me.y * sc, 3.5, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke(); }
}
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - G.last) / 1000); G.last = now;
  if (G.phase === 'start' || G.phase === 'end') return;
  G.t += dt;
  if (G.phase === 'play' && !G.paused && !G.inMinigame) update(dt);
  render(); if (G.phase === 'play') drawMinimap();
}

// ---------- Boot ----------
loadSettings(); loadMedals();
$('loading-logo').src = SPRITE_DATA.logo_word || SPRITE_DATA.logo_main;
loadSprites().then(() => {
  $('loading').classList.add('hidden');
  $('start-logo').src = SPRITE_DATA.logo_main;
  document.querySelectorAll('[data-sprite]').forEach(im => im.src = SPRITE_DATA[im.dataset.sprite]);
  G.last = performance.now(); requestAnimationFrame(loop);
});
