// ===== BRODS — carreira (patentes/XP), campanha (fases) e chefões (modo Caçada) =====
'use strict';

// ---------- Patentes ----------
const RANKS = [
  { xp: 0,    name: 'Recruta',              icon: '🎒' },
  { xp: 150,  name: 'Detetive Júnior',      icon: '🔍', reward: 'Cor Dourada liberada' },
  { xp: 400,  name: 'Detetive',             icon: '🕵️', reward: 'Título Detetive' },
  { xp: 800,  name: 'Inspetor',             icon: '🎖️', reward: 'Cor Prata liberada' },
  { xp: 1400, name: 'Caçador de Demônios',  icon: '⚔️', reward: 'Cor Neon liberada' },
  { xp: 2200, name: 'Lenda da Mansão',      icon: '👑', reward: 'Título Lenda' },
];
const SPECIAL_COLORS = [
  { name: 'Dourado', css: '#e6b400', hue: 46, sat: 1.25, light: 1.08, rank: 1 },
  { name: 'Prata',   css: '#c0c6d0', hue: 210, sat: .12, light: 1.45, rank: 3 },
  { name: 'Neon',    css: '#39ff14', hue: 105, sat: 1.3, light: 1.2, rank: 4 },
];
const CAREER = { xp: 0, games: 0, wins: 0 };
function loadCareer() { try { Object.assign(CAREER, JSON.parse(localStorage.getItem('brods_career') || '{}')); } catch (e) { } }
function saveCareer() { localStorage.setItem('brods_career', JSON.stringify(CAREER)); }
function rankIndex(xp) { let i = 0; for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].xp) i = k; return i; }
function rankOf(xp) { return RANKS[rankIndex(xp)]; }
function renderRank() {
  const ri = rankIndex(CAREER.xp), r = RANKS[ri], next = RANKS[ri + 1];
  const pct = next ? Math.round(100 * (CAREER.xp - r.xp) / (next.xp - r.xp)) : 100;
  $('rank-badge').textContent = `${r.icon} ${r.name}`;
  $('rank-fill').style.width = pct + '%';
  $('rank-xp').textContent = next ? `${CAREER.xp} / ${next.xp} XP` : `${CAREER.xp} XP · máximo`;
  // cores especiais liberadas
  const cp = $('color-pick'); cp.querySelectorAll('i.special').forEach(x => x.remove());
  SPECIAL_COLORS.forEach((c, k) => { const d = document.createElement('i'); d.className = 'special' + (ri >= c.rank ? '' : ' locked'); d.style.background = c.css; d.title = c.name + (ri >= c.rank ? '' : ` (patente ${RANKS[c.rank].name})`); const idx = VENUS_COLORS.length + k; if (+(localStorage.getItem('brods_color') || 0) === idx) d.classList.add('on'); d.addEventListener('click', () => { if (ri < c.rank) { toast(`🔒 ${c.name}: alcance a patente ${RANKS[c.rank].name}`); return; } localStorage.setItem('brods_color', idx); cp.querySelectorAll('i').forEach(x => x.classList.remove('on')); d.classList.add('on'); SFX.play('tick'); }); cp.appendChild(d); });
}
function allColors() { return VENUS_COLORS.concat(SPECIAL_COLORS); }
function addXp(amount, lines) {
  const before = rankIndex(CAREER.xp); CAREER.xp += amount; saveCareer(); const after = rankIndex(CAREER.xp);
  if (after > before) { setTimeout(() => { toast(`⭐ NOVA PATENTE: ${RANKS[after].icon} ${RANKS[after].name}!` + (RANKS[after].reward ? ' — ' + RANKS[after].reward : '')); SFX.play('win'); }, 1800); }
  renderRank();
  return { amount, lines, rankUp: after > before };
}
function careerOnEnd(winner) {
  const me = G.player; const iWon = me.kind === winner; const L = []; let xp = 0;
  const add = (v, t) => { xp += v; L.push(`+${v} ${t}`); };
  add(20, 'partida jogada');
  if (iWon) add(60, 'vitória');
  const myTasks = me.tasks.filter(t => t.done).length; if (me.kind === 'venus' && myTasks) add(myTasks * 5, `${myTasks} missões`);
  if (me.kind === 'venus' && G.myFirstVoteHit) add(15, 'voto certo');
  if (alive(me) || me.jailed) add(15, 'sobreviveu');
  if (me.kind !== 'venus') { const k = (G.myKills || 0); if (k) add(k * 8, `${k} ataques`); }
  if (G.mode === 'boss' && iWon) add(150, 'chefão derrotado');
  if (G.mode === 'phase' && iWon) add(30, 'fase da campanha');
  CAREER.games++; if (iWon) CAREER.wins++;
  const r = addXp(xp, L);
  $('win-xp').innerHTML = `<b>+${xp} XP</b> · ${L.join(' · ')}`; $('win-xp').classList.remove('hidden');
  return r;
}

// ---------- Campanha ----------
const PHASES = [
  { id: 1, name: 'A Mansão Acorda',     desc: '6 personagens, só o DEMOM. Sem sabotagens. Aprenda a desconfiar.',           players: 6,  chefe: false, sab: false, demoms: 1, boss: { name: 'Demom Sombrio',     base: 'demom', scale: 1.45, speed: 168, range: 52, hue: null,  dark: false } },
  { id: 2, name: 'O Cozinheiro Chega',  desc: '8 personagens. O CHEFE entra no jogo. Cuidado com a Cozinha.',                players: 8,  chefe: true,  sab: false, demoms: 1, boss: { name: 'Chefe Gigante',     base: 'chefe', scale: 1.65, speed: 160, range: 60, hue: null,  dark: false } },
  { id: 3, name: 'Luzes Apagadas',      desc: '8 personagens. Sabotagens liberadas e a mansão começa no escuro.',            players: 8,  chefe: true,  sab: true,  demoms: 1, startDark: true, boss: { name: 'Demom das Trevas', base: 'demom', scale: 1.5, speed: 172, range: 54, hue: 275, dark: true } },
  { id: 4, name: 'Dois Demons',         desc: '10 personagens e DOIS DEMOM. Ninguém está seguro.',                           players: 10, chefe: true,  sab: true,  demoms: 2, boss: { name: 'Os Gêmeos',         base: 'demom', scale: 1.4, speed: 165, range: 50, hue: 10,   dark: false, twins: true } },
  { id: 5, name: 'O Senhor da Mansão',  desc: '12 personagens, tudo ligado. O dono da mansão está de olho em você.',         players: 12, chefe: true,  sab: true,  demoms: 2, boss: { name: 'O Senhor da Mansão', base: 'demom', scale: 1.9, speed: 178, range: 62, hue: 285, light: .6, dark: true, locks: true } },
];
const CAMP = { p: {} };   // p[id] = { wins, boss }
function loadCampaign() { try { Object.assign(CAMP, JSON.parse(localStorage.getItem('brods_campaign') || '{}')); } catch (e) { } for (const ph of PHASES) if (!CAMP.p[ph.id]) CAMP.p[ph.id] = { wins: 0, boss: false }; }
function saveCampaign() { localStorage.setItem('brods_campaign', JSON.stringify(CAMP)); }
function phaseUnlocked(ph) { return ph.id === 1 || CAMP.p[ph.id - 1].boss; }
function openCampaign() {
  const body = $('camp-body'); body.innerHTML = '';
  for (const ph of PHASES) {
    const st = CAMP.p[ph.id]; const unlocked = phaseUnlocked(ph);
    const card = el('div', 'ph-card' + (unlocked ? '' : ' locked') + (st.boss ? ' done' : ''));
    const head = el('div', 'ph-head'); head.appendChild(el('span', 'ph-num', unlocked ? String(ph.id) : '🔒')); const tt = el('div', 'ph-title'); tt.appendChild(el('b', '', ph.name)); tt.appendChild(el('small', '', ph.desc)); head.appendChild(tt);
    const stars = el('span', 'ph-stars', (st.wins >= 1 ? '★' : '☆') + (st.wins >= 2 ? '★' : '☆') + (st.boss ? '👑' : '☆')); head.appendChild(stars); card.appendChild(head);
    const row = el('div', 'ph-row');
    const b1 = el('button', 'small-btn', unlocked ? `Jogar fase (${Math.min(st.wins, 2)}/2 vitórias)` : 'Bloqueada'); b1.disabled = !unlocked; b1.onclick = () => { $('campaign').classList.add('hidden'); startPhase(ph); }; row.appendChild(b1);
    const b2 = el('button', 'small-btn boss-btn', st.boss ? `👑 ${ph.boss.name} (derrotado) — jogar de novo` : `👹 Enfrentar ${ph.boss.name}`); b2.disabled = !unlocked || st.wins < 2; b2.title = st.wins < 2 ? 'Vença 2 partidas desta fase para liberar o chefão' : ''; b2.onclick = () => { $('campaign').classList.add('hidden'); startBoss(ph); }; row.appendChild(b2);
    card.appendChild(row); body.appendChild(card);
  }
  $('campaign').classList.remove('hidden');
}
let _settingsBackup = null;
function applyPhaseSettings(ph) {
  _settingsBackup = Object.assign({}, SETTINGS);
  SETTINGS.demomCount = ph.demoms; SETTINGS.tasksPerVenus = 5;
  G.campNoChefe = !ph.chefe; G.campNoSab = !ph.sab; G.campStartDark = !!ph.startDark;
}
function restoreSettings() { if (_settingsBackup) { Object.assign(SETTINGS, _settingsBackup); _settingsBackup = null; } G.campNoChefe = false; G.campNoSab = false; G.campStartDark = false; }
function startPhase(ph) {
  applyPhaseSettings(ph); $('players-range').value = ph.players; renderCrowd();
  G.mode = 'phase'; G.phaseId = ph.id; G.forceRole = 'venus'; newGame();
}
function campaignOnEnd(winner) {
  if (G.mode === 'phase') { const st = CAMP.p[G.phaseId]; if (winner === 'venus') { st.wins++; saveCampaign(); if (st.wins === 2) setTimeout(() => toast(`👹 Chefão da fase ${G.phaseId} liberado!`), 1200); } }
  if (G.mode === 'boss') { const st = CAMP.p[G.phaseId]; if (winner === 'venus') { if (!st.boss) { st.boss = true; saveCampaign(); unlockMedal('boss' + G.phaseId); const nx = PHASES.find(p => p.id === G.phaseId + 1); setTimeout(() => toast(nx ? `🔓 Fase ${nx.id} — ${nx.name} liberada!` : '👑 Você completou a campanha!'), 1200); } } }
  restoreSettings(); G.mode = 'free';
}

// ---------- Modo Caçada (chefão) ----------
const BOSS = { active: false, cfg: null, bosses: [], stage: 0, glassDone: 0, exitOpen: false, lostT: 0 };
const GLASS_POS = [[660, 985], [940, 985], [800, 1160]];
const EXIT_POS = { x: 1020, y: 810 };
function startBoss(ph) {
  applyPhaseSettings(ph); $('players-range').value = 6; renderCrowd();
  G.mode = 'boss'; G.phaseId = ph.id; G.forceRole = 'venus'; G.bossCfg = ph.boss; newGame();
}
function bossSetup() {
  // chamado no fim do newGame quando G.mode === 'boss'
  const cfg = G.bossCfg; BOSS.active = true; BOSS.cfg = cfg; BOSS.bosses = []; BOSS.stage = 0; BOSS.glassDone = 0; BOSS.exitOpen = false;
  // converte vilões bots em VENUS (na caçada só existe o chefão)
  for (const e of G.entities) if (e.isBot && e.kind !== 'venus') { e.kind = 'venus'; e._sp = null; e._true = null; }
  const n = cfg.twins ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const color = { name: cfg.name, css: '#7a2ebe' };
    const b = makeEntity('boss', color, true); b.name = cfg.twins ? cfg.name.replace('Os ', '') + ' ' + (i + 1) : cfg.name; b.base = cfg.base; b.scale = cfg.scale; b.speed = cfg.speed; b.range = cfg.range; b.hue = cfg.hue; b.lightK = cfg.light; b.rad = 22;
    b.x = i === 0 ? 210 : 2200; b.y = i === 0 ? 160 : 560; b.ai.state = 'hunt'; b.stunT = 0; b.killCd = 0; b.sabCd = 20;
    G.entities.push(b); BOSS.bosses.push(b);
  }
  // missões: 4 do jogador
  G.player.tasks = G.player.tasks.slice(0, 4); renderTaskList();
  if (cfg.dark) { G.dark = true; }
  showHint(`👹 ${cfg.name} está caçando você! Faça 4 missões, acenda os 3 vitrais da Capela e fuja pelo portão do Salão. Passagens secretas ajudam!`); G.hintT = 12;
  updateBossBanner();
}
function bossUpdate(dt) {
  if (!BOSS.active || G.phase !== 'play') return;
  const me = G.player; const cfg = BOSS.cfg;
  for (const b of BOSS.bosses) {
    if (b.stunT > 0) { b.stunT -= dt; b.moving = false; continue; }
    // alvo: jogador (85%) ou o VENUS bot mais próximo
    if (!b.target || Math.random() < dt * .3) b.target = (Math.random() < .85 || !G.entities.some(e => e.isBot && e.kind === 'venus' && alive(e))) ? me : G.entities.filter(e => e.isBot && e.kind === 'venus' && alive(e)).sort((p, q) => dist(p, b) - dist(q, b))[0];
    const t = b.target; if (!t || !alive(t)) { b.target = me; continue; }
    if (nodeAt(b.x, b.y) === nodeAt(t.x, t.y)) aiStep(b, t, dt); else { b.ai.pathT = (b.ai.pathT || 0) + dt; if (!b.ai.path.length || b.ai.pathT > .8) { b.ai.path = findPath(b, t); b.ai.pathT = 0; } aiFollow(b, dt); }
    // pega
    if (alive(me) && dist(b, me) < b.range) {
      if (me.shield) { me.shield = false; b.stunT = 2.5; SFX.play('bad'); toast('🧪 A Poção de Escudo te salvou! O chefão ficou tonto.'); spawnFx(me.x, me.y - 20, '#b98cff', 18, 140, .8); }
      else { bossLose(b); return; }
    }
    for (const e of G.entities) { if (!e.isBot || e.kind !== 'venus' || !alive(e)) continue; if (dist(b, e) < b.range && b.killCd <= 0) { b.killCd = 6; e.alive = false; e.ghost = true; G.bodies.push({ x: e.x, y: e.y, ent: e, t: G.t, room: roomAt(e.x, e.y) }); spawnFx(e.x, e.y - 20, '#ff1a1a', 14, 120, .7); SFX.play('kill'); } }
    if (b.killCd > 0) b.killCd -= dt;
    // Senhor da Mansão tranca portas de vez em quando
    if (cfg.locks) { b.sabCd -= dt; if (b.sabCd <= 0 && !SAB.active) { b.sabCd = 25 + Math.random() * 10; const r = roomAt(me.x, me.y); if (r) { SAB.active = { type: 'doors', t: 6, room: r }; SAB.blocked = []; for (const c of CORRIDORS) { const x0 = Math.max(r.x, c.x), x1 = Math.min(r.x + r.w, c.x + c.w), y0 = Math.max(r.y, c.y), y1 = Math.min(r.y + r.h, c.y + c.h); if (x1 >= x0 && y1 >= y0) { if (x1 - x0 > y1 - y0) SAB.blocked.push({ x: x0, y: y0 - 8, w: x1 - x0, h: 16 }); else SAB.blocked.push({ x: x0 - 8, y: y0, w: 16, h: y1 - y0 }); } } SFX.play('door'); toast('🚪 O Senhor da Mansão trancou as portas!'); updateSabBanner(); } } }
  }
  // saída
  if (BOSS.exitOpen && alive(me) && Math.hypot(me.x - EXIT_POS.x, me.y - EXIT_POS.y) < 60) bossWin();
}
function bossCheckObjectives() {
  if (!BOSS.active) return;
  const tasksDone = G.player.tasks.every(t => t.done);
  if (tasksDone && BOSS.glassDone >= 3 && !BOSS.exitOpen) { BOSS.exitOpen = true; SFX.play('bell'); toast('🚪 O portão do Salão se abriu! FUJA!'); for (const b of BOSS.bosses) b.speed += 8; }
  updateBossBanner();
}
function updateBossBanner() {
  const b = $('sab-banner'); if (!BOSS.active) return; b.classList.remove('hidden'); b.classList.remove('urgent');
  const td = G.player.tasks.filter(t => t.done).length;
  b.textContent = BOSS.exitOpen ? '🚪 PORTÃO ABERTO — fuja pelo Salão!' : `👹 Caçada: missões ${td}/${G.player.tasks.length} · vitrais ${BOSS.glassDone}/3`;
}
function bossGlassAvailable(i) { return BOSS.active && !BOSS.glassLit?.[i]; }
function bossUseGlass(i) { if (!BOSS.glassLit) BOSS.glassLit = {}; openMinigame({ icon: '🪟', name: 'Acender o vitral', game: 'simon', p: { kind: 'candle', n: 3 } }, () => { BOSS.glassLit[i] = true; BOSS.glassDone++; spawnFx(GLASS_POS[i][0], GLASS_POS[i][1], '#8ab4ff', 20, 150, .9); for (const b of BOSS.bosses) { b.stunT = 3; } toast('🪟 Vitral aceso! O chefão recuou por um instante.'); bossCheckObjectives(); }); }
function bossWin() { BOSS.active = false; G.result = 'boss'; endGame('venus'); }
function bossLose(b) { BOSS.active = false; const me = G.player; me.alive = false; me.ghost = true; shakeAndFlash(16, true); SFX.play('kill'); G.result = 'caught'; setTimeout(() => endGame('boss'), 600); }
function drawBossExtras() {
  if (!BOSS.active) return;
  // vitrais
  for (let i = 0; i < 3; i++) { const [x, y] = GLASS_POS[i]; const lit = BOSS.glassLit && BOSS.glassLit[i]; const pulse = (Math.sin(G.t * 4 + i) + 1) / 2; ctx.strokeStyle = lit ? 'rgba(138,180,255,.9)' : `rgba(255,211,0,${.5 + .4 * pulse})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 8, 24, 11, 0, 0, 7); ctx.stroke(); if (!lit) { const by = y - 54 - pulse * 5; ctx.fillStyle = '#ffd300'; ctx.beginPath(); ctx.arc(x, by, 16, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke(); ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText('🪟', x, by + 1); ctx.textBaseline = 'alphabetic'; } }
  // portão
  if (BOSS.exitOpen) { const pulse = (Math.sin(G.t * 6) + 1) / 2; ctx.strokeStyle = `rgba(31,191,107,${.6 + .4 * pulse})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(EXIT_POS.x, EXIT_POS.y, 50 + pulse * 10, 22 + pulse * 5, 0, 0, 7); ctx.stroke(); ctx.font = '900 14px Nunito, Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#1fbf6b'; ctx.fillText('SAÍDA', EXIT_POS.x, EXIT_POS.y - 30); }
}
