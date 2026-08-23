// ===== BRODS — sabotagens do DEMOM =====
'use strict';

const SAB = {
  POWER: { x: 290, y: 975 },      // caixa de força (Porão)
  BELL: { x: 940, y: 1200 },      // sino (Capela)
  active: null,                   // {type, t, room?, fixers:Set}
  blocked: [],                    // retângulos bloqueados (portas trancadas)
};
const SAB_INFO = {
  lights: { name: 'Apagar as luzes', icon: '💡', desc: 'A mansão escurece; os VENUS só veem com a lanterna. Conserto na caixa de força do Porão.' },
  doors:  { name: 'Trancar portas', icon: '🚪', desc: 'Tranca as portas de um cômodo por 10 s.' },
  ghosts: { name: 'Soltar os fantasmas', icon: '👻', desc: 'Alarme! Dois VENUS precisam tocar o sino da Capela em 30 s, ou o DEMOM vence.' },
  mess:   { name: 'Bagunçar missão', icon: '💥', desc: 'Desfaz uma missão já concluída por um VENUS.' },
};

function canSabotage(e) { return G.phase === 'play' && alive(e) && e.kind === 'demom' && !SAB.active && (e.sabCd || 0) <= 0; }

function doSabotage(by, type, roomId) {
  if (!canSabotage(by)) return false;
  by.sabCd = SETTINGS.sabCooldown; logEvent('😈', `${by.name} (DEMOM) sabotou: ${SAB_INFO[type].name}`, 'sab');
  if (type === 'lights') {
    SAB.active = { type, t: 999, fixers: new Set() }; G.dark = true; SFX.play('lights'); if (by === G.player) G.usedLights = true;
    if (G.player.kind !== 'demom') { MUSIC.setMood('tense'); toast('💡 As luzes apagaram! Religue na caixa de força do Porão.'); } else toast('💡 Luzes apagadas!');
    aiOnSabotage(type);
  } else if (type === 'doors') {
    const r = ROOM_BY_ID[roomId] || ROOMS[Math.floor(Math.random() * ROOMS.length)];
    SAB.active = { type, t: 10, room: r };
    // bloqueia a faixa de contato entre o cômodo e cada corredor vizinho
    SAB.blocked = [];
    for (const c of CORRIDORS) {
      const x0 = Math.max(r.x, c.x), x1 = Math.min(r.x + r.w, c.x + c.w), y0 = Math.max(r.y, c.y), y1 = Math.min(r.y + r.h, c.y + c.h);
      if (x1 >= x0 && y1 >= y0) {
        if (x1 - x0 > y1 - y0) SAB.blocked.push({ x: x0, y: y0 - 8, w: x1 - x0, h: 16 }); else SAB.blocked.push({ x: x0 - 8, y: y0, w: 16, h: y1 - y0 });
      }
    }
    SFX.play('door'); toast(`🚪 As portas ${prep(r)} ${r.name} se trancaram!`);
  } else if (type === 'ghosts') {
    SAB.active = { type, t: 30, bell: new Set() }; SFX.play('alarm');
    if (G.player.kind !== 'demom') MUSIC.setMood('tense');
    toast('👻 OS FANTASMAS FORAM SOLTOS! Dois VENUS precisam tocar o sino da Capela!');
    aiOnSabotage(type);
  } else if (type === 'mess') {
    const cands = G.entities.filter(e => e.kind === 'venus' && e.alive && e.tasks.some(t => t.done));
    if (!cands.length) { by.sabCd = 5; return false; }
    const v = cands[Math.floor(Math.random() * cands.length)]; const done = v.tasks.filter(t => t.done); const t = done[Math.floor(Math.random() * done.length)];
    t.done = false; SFX.play('bad'); renderTaskList();
    toast(v === G.player ? `💥 Alguém bagunçou sua missão: ${TASK_BY_ID[t.id].name}!` : `💥 Uma missão do ${v.name} foi bagunçada!`);
  }
  updateSabBanner();
  return true;
}

function inBlocked(x, y) { for (const b of SAB.blocked) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true; return false; }

function sabUpdate(dt) {
  for (const e of G.entities) if (e.sabCd > 0) e.sabCd -= dt;
  const s = SAB.active; if (!s) return;
  if (s.type === 'doors') { s.t -= dt; if (s.t <= 0) endSabotage('As portas se abriram.'); }
  else if (s.type === 'ghosts') {
    s.t -= dt;
    const near = G.entities.filter(e => alive(e) && e.kind === 'venus' && Math.hypot(e.x - SAB.BELL.x, e.y - SAB.BELL.y) < 90);
    if (near.length >= 2) { SFX.play('bell'); endSabotage('🔔 O sino tocou! Os fantasmas voltaram pro sótão.'); }
    else if (s.t <= 0) { endSabotage(''); G.result = 'ghosts'; endGame('demom'); }
  }
  else if (s.type === 'lights') {
    // conserto: um VENUS (bot) parado na caixa de força por 4 s; o jogador usa o minijogo
    for (const e of G.entities) {
      if (!e.isBot || !alive(e) || e.kind !== 'venus') continue;
      if (Math.hypot(e.x - SAB.POWER.x, e.y - SAB.POWER.y) < 60) { e.fixT = (e.fixT || 0) + dt; if (e.fixT > 4) { endSabotage('💡 As luzes voltaram!'); return; } }
      else e.fixT = 0;
    }
  }
  updateSabBanner();
}
function endSabotage(msg) {
  const s = SAB.active; SAB.active = null; SAB.blocked = [];
  if (s && s.type === 'lights') { G.dark = false; }
  if (msg) toast(msg);
  if (G.phase === 'play') MUSIC.setMood(roleMood());
  for (const e of G.entities) { if (e.isBot && e.ai.sabTask) { e.ai.sabTask = null; e.ai.state = 'idle'; e.ai.wait = .5; } }
  updateSabBanner();
}
function updateSabBanner() {
  const b = $('sab-banner'); const s = SAB.active;
  if (!s) { b.classList.add('hidden'); return; }
  b.classList.remove('hidden');
  if (s.type === 'lights') b.textContent = '💡 LUZES APAGADAS — religue na caixa de força do Porão';
  else if (s.type === 'doors') b.textContent = `🚪 Portas trancadas ${prep(s.room)} ${s.room.name} — ${Math.ceil(s.t)}s`;
  else if (s.type === 'ghosts') { const near = G.entities.filter(e => alive(e) && e.kind === 'venus' && Math.hypot(e.x - SAB.BELL.x, e.y - SAB.BELL.y) < 90).length; b.textContent = `👻 FANTASMAS SOLTOS — ${Math.ceil(s.t)}s — ${near}/2 VENUS no sino da Capela`; }
  b.classList.toggle('urgent', s.type === 'ghosts' && s.t < 10);
}

// ---------- Menu de sabotagem (jogador DEMOM) ----------
function openSabMenu() {
  const me = G.player; if (G.phase !== 'play' || G.inMinigame || me.kind !== 'demom' || !alive(me)) return;
  G.inMinigame = true; SFX.play('open');
  const body = $('mg-body'); body.innerHTML = ''; body._cleanup = null; $('mg-title').textContent = '😈 Sabotagem';
  if (!canSabotage(me)) body.appendChild(el('p', 'mg-instr', SAB.active ? 'Já tem uma sabotagem acontecendo.' : `Recarregando… ${Math.ceil(me.sabCd)} s`));
  const row = el('div', 'sab-grid'); body.appendChild(row);
  for (const [k, info] of Object.entries(SAB_INFO)) {
    const b = el('button', 'sab-btn', `<span class="sab-ico">${info.icon}</span><b>${info.name}</b><small>${info.desc}</small>`);
    b.disabled = !canSabotage(me);
    b.onclick = () => {
      if (k === 'doors') { body.innerHTML = ''; body.appendChild(el('p', 'mg-instr', 'Trancar as portas de qual cômodo?')); const g = el('div', 'mg-row'); body.appendChild(g); for (const r of ROOMS) { const rb = el('button', 'small-btn', r.name); rb.onclick = () => { doSabotage(me, 'doors', r.id); closeMinigame(); }; g.appendChild(rb); } return; }
      doSabotage(me, k); closeMinigame();
    };
    row.appendChild(b);
  }
  $('minigame').classList.remove('hidden');
}

// ---------- Bots ----------
function aiSabotageTick(e, dt) {
  if (e.kind !== 'demom' || !e.isBot || !alive(e)) return; if (TUT.active) return;
  if (e.sabCd === undefined) e.sabCd = 35 + Math.random() * 20;
  if (!canSabotage(e)) return;
  if (Math.random() > dt * .12) return;     // em média a cada ~8 s quando pronto
  const V = countAlive('venus'); const r = Math.random();
  if (r < .5) doSabotage(e, 'lights');
  else if (r < .7) { const rooms = ROOMS.filter(rm => G.entities.some(v => alive(v) && v.kind === 'venus' && roomAt(v.x, v.y) === rm)); const rm = rooms[Math.floor(Math.random() * rooms.length)]; doSabotage(e, 'doors', rm && rm.id); }
  else if (r < .9 || V < 3) doSabotage(e, 'mess');
  else doSabotage(e, 'ghosts');
}
function aiOnSabotage(type) {
  // VENUS bots reagem: luzes → 2 mais próximos vão à caixa de força; fantasmas → 3 mais próximos vão ao sino
  const target = type === 'lights' ? SAB.POWER : SAB.BELL; const n = type === 'lights' ? 2 : 3;
  const bots = G.entities.filter(e => e.isBot && alive(e) && e.kind === 'venus').sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y)).slice(0, n);
  for (const b of bots) { b.ai.sabTask = type; aiGoto(b, { x: target.x + (Math.random() - .5) * 40, y: target.y + (Math.random() - .5) * 30 }); b.ai.state = 'goto'; }
}
