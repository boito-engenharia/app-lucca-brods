// ===== BRODS — multijogador por código de sala (host autoritativo, relay na Cloudflare) =====
'use strict';

const NET_BASE = 'brods-server.boito.workers.dev';
const NET = { on: false, host: false, ws: null, code: null, myId: null, members: [], remote: {}, inputs: {}, lastSnapSent: 0, lastInputSent: 0, lastInput: '', entById: {}, meEid: null, pingT: null, started: false };

function netSend(obj) { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); }
function netBroadcast(obj) { if (NET.host) netSend('*:' + JSON.stringify(obj)); }
function netTo(id, obj) { if (NET.host) netSend(id + ':' + JSON.stringify(obj)); }

// ---------- Lobby ----------
function openOnline() { $('online').classList.remove('hidden'); $('lobby').classList.add('hidden'); $('online-choice').classList.remove('hidden'); $('online-status').textContent = ''; }
async function createRoom() {
  $('online-status').textContent = 'Criando sala…';
  try { const r = await fetch('https://' + NET_BASE + '/new'); const j = await r.json(); if (!j.code) throw new Error('sem código'); joinRoom(j.code, true); }
  catch (e) { $('online-status').textContent = 'Não consegui criar a sala. Verifique a internet e tente de novo.'; }
}
function joinRoom(code, asHost) {
  code = (code || '').trim().toUpperCase(); if (code.length < 4) { $('online-status').textContent = 'Digite o código da sala (4 letras).'; return; }
  $('online-status').textContent = 'Conectando…';
  const name = encodeURIComponent(playerName()); const color = +(localStorage.getItem('brods_color') || 0);
  const ws = new WebSocket(`wss://${NET_BASE}/room/${code}?name=${name}&color=${color}${asHost ? '&host=1' : ''}`);
  NET.ws = ws; NET.code = code; NET.host = false; NET.on = true; NET.started = false;
  ws.onopen = () => { $('online-status').textContent = ''; clearInterval(NET.pingT); NET.pingT = setInterval(() => netSend('ping'), 25000); };
  ws.onmessage = (e) => netOnMessage(e.data);
  ws.onclose = (e) => { clearInterval(NET.pingT); if (NET.on) { NET.on = false; if (G.phase === 'play' || G.phase === 'meeting') { toast('Conexão com a sala caiu.'); quitGame(); } $('online-status').textContent = e.reason ? 'Desconectado: ' + e.reason : 'Desconectado da sala.'; $('lobby').classList.add('hidden'); $('online-choice').classList.remove('hidden'); } };
  ws.onerror = () => { $('online-status').textContent = 'Não consegui entrar. Confira o código e a internet.'; };
}
function leaveRoom() { NET.on = false; if (NET.ws) { try { NET.ws.close(); } catch (e) { } } NET.ws = null; NET.members = []; NET.host = false; $('lobby').classList.add('hidden'); $('online-choice').classList.remove('hidden'); }
function renderLobby() {
  $('online-choice').classList.add('hidden'); $('lobby').classList.remove('hidden');
  $('lobby-code').textContent = NET.code;
  const ul = $('lobby-list'); ul.innerHTML = '';
  for (const m of NET.members) { const li = el('li', 'lobby-m' + (m.id === NET.myId ? ' me' : '')); const dot = el('i'); const col = allColors()[+m.color] || VENUS_COLORS[0]; dot.style.background = col.css; li.appendChild(dot); li.appendChild(el('span', '', m.name + (m.host ? ' 👑' : '') + (m.id === NET.myId ? ' (você)' : ''))); ul.appendChild(li); }
  $('lobby-host').classList.toggle('hidden', !NET.host); $('lobby-guest').classList.toggle('hidden', NET.host);
  $('lobby-count').textContent = `${NET.members.length} na sala · a mansão terá ${Math.max(+$('players-range').value, NET.members.length)} personagens (o resto são bots)`;
}

// ---------- Mensagens ----------
function netOnMessage(raw) {
  if (raw === 'pong') return;
  let from = null, body = raw;
  if (NET.host) { const i = raw.indexOf(':'); if (i > 0 && i < 10 && raw[0] !== '{') { from = raw.slice(0, i); body = raw.slice(i + 1); } }
  let msg; try { msg = JSON.parse(body); } catch (e) { return; }
  // controle da sala
  if (msg.t === 'welcome') { NET.myId = msg.you; NET.host = msg.host === msg.you; NET.members = msg.members; renderLobby(); return; }
  if (msg.t === 'members') { NET.members = msg.members.filter(m => m.id); if (!NET.started) renderLobby(); if (NET.host && NET.started) { /* novo jogador no meio: ignora por enquanto */ } return; }
  if (msg.t === 'host_left') { toast('O dono da sala saiu.'); NET.on = false; quitGame(); leaveRoom(); return; }
  if (msg.t === 'left') { if (NET.host && NET.started) { const e = NET.remote[msg.id]; if (e) { e.isBot = true; e.isRemote = false; e.name = e.name + ' (bot)'; toast(`${msg.name} saiu — virou bot.`); } } return; }
  if (NET.host) netHostHandle(from, msg); else netGuestHandle(msg);
}

// ---------- HOST ----------
function hostStartGame() {
  if (!NET.host) return; NET.started = true;
  const humans = NET.members.filter(m => m.id !== NET.myId);
  const n = Math.max(+$('players-range').value, NET.members.length, 4);
  $('players-range').value = n; $('online').classList.add('hidden');
  G.netGame = true; newGame();
  // converte bots em jogadores remotos
  NET.remote = {}; NET.inputs = {};
  const bots = G.entities.filter(e => e.isBot).sort(() => Math.random() - .5);
  humans.forEach((m, i) => { const e = bots[i]; if (!e) return; e.isBot = false; e.isRemote = true; e.remoteId = m.id; e.name = m.name; const col = allColors()[+m.color]; if (col && !G.entities.some(o => o !== e && o.color.name === col.name)) { e.color = col; e._sp = null; } NET.remote[m.id] = e; NET.inputs[m.id] = { ax: 0, ay: 0 }; });
  // envia o começo pra cada um
  const roster = G.entities.map(e => ({ eid: e.id, name: e.name, color: e.color, remote: !!e.isRemote, bot: !!e.isBot }));
  for (const m of humans) { const e = NET.remote[m.id]; if (!e) { netTo(m.id, { t: 'full' }); continue; } netTo(m.id, { t: 'start', you: e.id, role: e.kind, roster, tasks: e.tasks.map(t => t.id), settings: { tasksPerVenus: SETTINGS.tasksPerVenus, killCooldown: SETTINGS.killCooldown, swallowCooldown: SETTINGS.swallowCooldown, digestTime: SETTINGS.digestTime, playerSpeed: SETTINGS.playerSpeed }, host: G.player.name }); }
}
function netHostHandle(from, msg) {
  const e = NET.remote[from]; if (!e) return;
  if (msg.t === 'i') { NET.inputs[from] = { ax: +msg.ax || 0, ay: +msg.ay || 0, t: performance.now() }; return; }
  if (msg.t === 'a') {
    if (G.phase !== 'play') return;
    if (msg.k === 'use') {
      // missão própria?
      let best = 70, task = null; if (alive(e)) for (const t of e.tasks) { if (t.done) continue; const p = taskPos(TASK_BY_ID[t.id]); const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < best) { best = d; task = t; } }
      if (task) { netTo(from, { t: 'mg', task: task.id }); return; }
      if (alive(e) && Math.hypot(EMERGENCY.x - e.x, EMERGENCY.y - e.y) < 60 && !SAB.active && G.meetingCd <= 0 && !e.usedEmergency) { e.usedEmergency = true; startMeeting({ type: 'emergency', reporter: e }); return; }
      if (alive(e) && SAB.active && SAB.active.type === 'lights' && e.kind !== 'demom' && Math.hypot(SAB.POWER.x - e.x, SAB.POWER.y - e.y) < 70) { netTo(from, { t: 'mg', task: '__power' }); return; }
      if (alive(e) && e.kind !== 'venus') for (const s of SECRET) { if (Math.hypot(s.ax - e.x, s.ay - e.y) < 50) { e.x = s.bx; e.y = s.by; e.jumpT = .5; return; } if (Math.hypot(s.bx - e.x, s.by - e.y) < 50) { e.x = s.ax; e.y = s.ay; e.jumpT = .5; return; } }
      if (alive(e)) for (const sp of SPECIALS) { if (sp.id === 'potion' && !SP.potionUsed && !e.shield && Math.hypot(sp.x - e.x, sp.y - e.y) < 60) { SP.potionUsed = true; e.shield = true; netTo(from, { t: 'toast', m: '🧪 Você bebeu a Poção de Escudo!' }); return; } }
      return;
    }
    if (msg.k === 'report') { if (!alive(e)) return; for (const b of G.bodies) if (Math.hypot(b.x - e.x, b.y - e.y) < 90) { startMeeting({ type: 'body', reporter: e, body: b }); return; } return; }
    if (msg.k === 'kill') { if (!alive(e) || e.kind === 'venus' || e.killCd > 0) return; let bd = 52, tg = null; for (const o of G.entities) { if (o === e || !alive(o)) continue; const d = dist(o, e); if (d < bd) { bd = d; tg = o; } } if (tg) { if (e.kind === 'demom') killEntity(e, tg); else swallowEntity(e, tg); } return; }
    if (msg.k === 'sab') { if (e.kind === 'demom') doSabotage(e, msg.type, msg.room); return; }
  }
  if (msg.t === 'td') { const task = e.tasks.find(t => t.id === msg.task && !t.done); if (task) completeTask(e, task); else if (msg.task === '__power' && SAB.active && SAB.active.type === 'lights') endSabotage('💡 As luzes voltaram!'); return; }
  if (msg.t === 'say') { if (M.active && alive(e)) humanSays(e, String(msg.text || '').slice(0, 120)); return; }
  if (msg.t === 'vote') { if (M.active && M.phase === 'vote' && alive(e)) castVote(e, msg.target === 'skip' ? 'skip' : +msg.target); return; }
}
function hostSnapshot(force) {
  if (!NET.host || !NET.started) return;
  const now = performance.now(); if (!force && now - NET.lastSnapSent < 80) return; NET.lastSnapSent = now;
  const ents = G.entities.map(e => [e.id, Math.round(e.x), Math.round(e.y), e.facing[0], e.moving ? 1 : 0, e.alive ? 1 : 0, e.swallowed ? 1 : 0, e.jailed ? 1 : 0, (e.revealT > 0 && e.kind !== 'venus') ? e.kind : 0, e.shield ? 1 : 0, Math.ceil(e.killCd || 0), e.ghost ? 1 : 0]);
  const bodies = G.bodies.map(b => [Math.round(b.x), Math.round(b.y), b.ent.id]);
  const p = taskProgress();
  const sab = SAB.active ? [SAB.active.type, Math.ceil(SAB.active.t || 0), SAB.active.room ? SAB.active.room.id : null] : null;
  netSend('*:' + JSON.stringify({ t: 's', e: ents, b: bodies, d: G.dark ? 1 : 0, sab, blk: SAB.blocked, tp: p.tot ? Math.round(100 * p.done / p.tot) : 0, ph: G.phase }));
}
function hostApplyInputs(dt) { const now = performance.now(); for (const id in NET.remote) { const e = NET.remote[id]; if (!e || e.swallowed || e.jailed) continue; const inp = NET.inputs[id] || { ax: 0, ay: 0, t: 0 }; if (now - (inp.t || 0) > 1500) { moveEntity(e, 0, 0, dt); continue; } moveEntity(e, inp.ax, inp.ay, dt); } }
function hostTaskUpdate(e) { if (e.isRemote) netTo(e.remoteId, { t: 'tasks', tasks: e.tasks.map(t => [t.id, t.done ? 1 : 0]) }); }
// eventos de reunião (chamados pelo meeting.js)
function hostMeetingEvent(k, data) { if (NET.host && NET.started) netBroadcast(Object.assign({ t: 'm', k }, data)); }
function hostEndGame(winner) { if (NET.host && NET.started) netBroadcast({ t: 'end', winner, roster: G.entities.map(e => ({ eid: e.id, kind: e.kind, alive: e.alive })) }); }

// ---------- GUEST ----------
function netGuestHandle(msg) {
  if (msg.t === 'full') { $('online-status').textContent = 'A sala está cheia.'; return; }
  if (msg.t === 'start') { guestStart(msg); return; }
  if (msg.t === 's') { guestSnapshot(msg); return; }
  if (msg.t === 'mg') { if (msg.task === '__power') openMinigame({ icon: '⚡', name: 'Religar a caixa de força', game: 'toggleAll', p: { n: 6 } }, () => netSend({ t: 'td', task: '__power' })); else { const def = TASK_BY_ID[msg.task]; if (def) openMinigame(def, () => netSend({ t: 'td', task: msg.task })); } return; }
  if (msg.t === 'tasks') { const me = G.player; me.tasks = msg.tasks.map(([id, d]) => ({ id, done: !!d })); renderTaskList(); return; }
  if (msg.t === 'toast') { toast(msg.m); return; }
  if (msg.t === 'm') { guestMeeting(msg); return; }
  if (msg.t === 'end') { guestEnd(msg); return; }
}
function guestStart(msg) {
  NET.started = true; $('online').classList.add('hidden');
  buildWalk(); buildNav(); mapLayer = null; _lights = null; lightStatic = null;
  G.entities = []; NET.entById = {}; G.bodies = []; G.events = []; G.prints = []; G.fx = []; G.shake = 0; specialsReset(); SAB.active = null; SAB.blocked = []; G.dark = false;
  Object.assign(SETTINGS, msg.settings || {});
  for (const r of msg.roster) { const kind = r.eid === msg.you ? msg.role : 'venus'; const e = makeEntity(kind, r.color, !!r.bot); e.id = r.eid; e.name = r.name; e.isRemote = r.remote; e.tx = e.x; e.ty = e.y; G.entities.push(e); NET.entById[e.id] = e; }
  G.player = NET.entById[msg.you]; NET.meEid = msg.you; G.player.tasks = (msg.tasks || []).map(id => ({ id, done: false }));
  G.guest = true; G.mode = 'free'; G.t = 0; G.last = performance.now(); G.paused = false; G.inMinigame = false;
  G.emergenciesLeft = 1; G.meetingCd = 10; G.near = null; G.nearBody = null; G.nearTarget = null;
  // revelação
  const info = ROLE_INFO[msg.role]; const me = G.player;
  $('start').classList.add('hidden'); $('win').classList.add('hidden'); $('ghost-note').classList.add('hidden');
  G.phase = 'reveal';
  $('reveal-img').src = SPRITE_DATA[msg.role + '_front']; $('reveal-role').textContent = info.title; $('reveal-role').className = info.cls; $('reveal-goal').textContent = info.goal;
  $('reveal-mates').textContent = msg.role === 'venus' ? `Sala ${NET.code} · dono: ${msg.host}. Há vilões escondidos entre os outros!` : `Sala ${NET.code} · dono: ${msg.host}.`;
  if (msg.role !== 'venus') { $('reveal-disguise').classList.remove('hidden'); $('reveal-disguise-text').innerHTML = `👀 <b>Ninguém vê que você é ${info.title}.</b><br>Para todo mundo, você é o <b>VENUS ${me.color.name}</b>.`; } else $('reveal-disguise').classList.add('hidden');
  $('reveal-controls').innerHTML = msg.role === 'venus' ? `<span class="key">E</span> USAR · <span class="key">R</span> REPORTAR` : `<span class="key">Q</span> ${msg.role === 'chefe' ? 'ENGOLIR' : 'MATAR'} · <span class="key">E</span> USAR · <span class="key">R</span> REPORTAR`;
  $('reveal').className = 'overlay ' + info.cls; $('reveal').classList.remove('hidden'); SFX.play(msg.role === 'venus' ? 'ok' : 'kill');
  setTimeout(() => { $('reveal').classList.add('hidden'); G.phase = 'play'; $('hud').classList.remove('hidden'); setupHud(); MUSIC.setMood(roleMood()); G.hintT = isTouch ? 8 : 30; if (isTouch) setTimeout(() => $('disguise').classList.add('fade'), 7000); showHint(msg.role === 'venus' ? 'Faça suas missões (E) e reporte corpos (R). Vocês estão jogando juntos!' : `Você é ${info.title} disfarçado. Chegue perto de alguém sozinho e aperte Q.`); }, 5200);
}
function guestSnapshot(msg) {
  if (!G.guest) return;
  for (const row of msg.e) {
    const [id, x, y, f, m, al, sw, ja, rv, sh, cd, gh] = row; const e = NET.entById[id]; if (!e) continue;
    if (e.tx === undefined || Math.hypot(e.tx - x, e.ty - y) > 300) { e.x = x; e.y = y; }
    e.tx = x; e.ty = y; e.facing = { d: 'down', u: 'up', l: 'left', r: 'right' }[f] || 'down'; e.moving = !!m;
    const wasAlive = e.alive; e.alive = !!al; e.swallowed = !!sw; e.jailed = !!ja; e.ghost = !!gh; e.shield = !!sh; e.killCd = cd;
    if (rv) { e.kind = rv; e.revealT = .3; e._true = null; } else if (e !== G.player && e.revealT <= 0 && e.kind !== 'venus') { e.kind = 'venus'; }
    if (e === G.player && wasAlive && !e.alive) { becomeGhost(e.swallowed ? 'Você foi engolido!' : 'Você morreu!'); }
    if (e === G.player && !wasAlive && e.alive) { $('ghost-note').classList.add('hidden'); }
  }
  G.bodies = msg.b.map(([x, y, eid]) => { const prev = G.bodies.find(b => b.ent.id === eid); return { x, y, ent: NET.entById[eid], t: prev ? prev.t : G.t, room: roomAt(x, y) }; });
  G.dark = !!msg.d; SAB.blocked = msg.blk || [];
  if (msg.sab) { if (!SAB.active || SAB.active.type !== msg.sab[0]) { SAB.active = { type: msg.sab[0], t: msg.sab[1], room: ROOM_BY_ID[msg.sab[2]] }; if (msg.sab[0] === 'lights' || msg.sab[0] === 'ghosts') MUSIC.setMood(G.player.kind === 'demom' ? roleMood() : 'tense'); } else { SAB.active.t = msg.sab[1]; } updateSabBanner(); }
  else if (SAB.active) { SAB.active = null; updateSabBanner(); MUSIC.setMood(roleMood()); }
  $('task-count').textContent = msg.tp + '%'; $('task-fill').style.width = msg.tp + '%';
}
function guestUpdate(dt) {
  const me = G.player; if (!me) return;
  // interpola
  for (const e of G.entities) { if (e.tx === undefined) continue; const k = Math.min(1, dt * 14); e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; if (e.moving) e.anim += dt * 10; else e.anim = 0; if (e.revealT > 0) e.revealT -= dt; if (e.jumpT > 0) e.jumpT -= dt; }
  // câmera
  const vw = canvas.width / G.cam.zoom, vh = canvas.height / G.cam.zoom;
  const cx = Math.max(vw / 2 - 60, Math.min(WORLD.w - vw / 2 + 60, me.x)), cy = Math.max(vh / 2 - 60, Math.min(WORLD.h - vh / 2 + 60, me.y));
  G.cam.x += (cx - G.cam.x) * Math.min(1, dt * 8); G.cam.y += (cy - G.cam.y) * Math.min(1, dt * 8);
  const r = roomAt(me.x, me.y); if (r !== G.room) { if (r && me.alive) SFX.play('door'); G.room = r; $('room-name').textContent = r ? r.name : 'Corredor'; }
  // input
  let ax = 0, ay = 0;
  if (keys['arrowleft'] || keys['a']) ax -= 1; if (keys['arrowright'] || keys['d']) ax += 1; if (keys['arrowup'] || keys['w']) ay -= 1; if (keys['arrowdown'] || keys['s']) ay += 1;
  if (joy.active) { ax += joy.dx; ay += joy.dy; }
  const mag = Math.hypot(ax, ay); if (mag > 1) { ax /= mag; ay /= mag; }
  NET.curInput = { ax: +ax.toFixed(2), ay: +ay.toFixed(2) };
  if (!NET.inputTimer) NET.inputTimer = setInterval(() => { if (!G.guest || !NET.on) { clearInterval(NET.inputTimer); NET.inputTimer = null; return; } const c = NET.curInput || { ax: 0, ay: 0 }; const s = c.ax + ',' + c.ay; const now = performance.now(); if (s !== NET.lastInput || now - NET.lastInputSent > 400) { NET.lastInput = s; NET.lastInputSent = now; netSend({ t: 'i', ax: c.ax, ay: c.ay }); } }, 100);
  // predição leve do próprio movimento (suaviza)
  if (mag > .1 && alive(me) && !me.jailed) { const nx = me.x + ax * me.speed * dt * .6, ny = me.y + ay * me.speed * dt * .6; if (canStand(nx, me.y, me.rad)) me.x = nx; if (canStand(me.x, ny, me.rad)) me.y = ny; me.moving = true; if (Math.abs(ax) > Math.abs(ay)) me.facing = ax < 0 ? 'left' : 'right'; else me.facing = ay < 0 ? 'up' : 'down'; }
  G.meetingCd = Math.max(0, G.meetingCd - dt);
  updatePlayerNear(); updateCooldownHud(); fxUpdate(dt);
  if (G.hintT > 0) { G.hintT -= dt; if (G.hintT <= 0) hideHint(); }
}
// ações do convidado (substituem as locais)
function guestUse() { if (G.phase !== 'play' || G.inMinigame) return; netSend({ t: 'a', k: 'use' }); }
function guestReport() { if (G.phase !== 'play' || G.inMinigame) return; netSend({ t: 'a', k: 'report' }); }
function guestKill() { if (G.phase !== 'play' || G.inMinigame) return; netSend({ t: 'a', k: 'kill' }); }
function guestSab(type, room) { netSend({ t: 'a', k: 'sab', type, room }); }
// reunião no convidado
function guestMeeting(msg) {
  if (msg.k === 'start') {
    G.phase = 'meeting'; closeMinigame(); hideHint(); SFX.play('alarm'); MUSIC.setMood('meeting');
    M.active = true; M.phase = 'talk'; M.votes = new Map(); M.playerVoted = false; M.info = { type: msg.type, reporter: NET.entById[msg.reporter], body: msg.victim ? { ent: NET.entById[msg.victim] } : null };
    // teleporta os vivos pro salão (visual)
    const liv = G.entities.filter(e => alive(e)); liv.forEach((e, i) => { const a = (i / liv.length) * Math.PI * 2; e.x = e.tx = 1020 + Math.cos(a) * 130; e.y = e.ty = 620 + Math.sin(a) * 95; });
    G.bodies = [];
    $('meet-title').textContent = msg.title; $('chat-log').innerHTML = ''; sysLine(msg.sys);
    const canTalk = alive(G.player); $('chat-input').disabled = !canTalk; $('chat-send').disabled = !canTalk; $('btn-skip').disabled = true;
    M.timer = msg.timer; $('meet-status').textContent = 'Discussão'; updateTimer(); renderMeetPlayers(); $('meeting').classList.remove('hidden');
    clearInterval(M.interval); M.interval = setInterval(() => { M.timer = Math.max(0, M.timer - 1); updateTimer(); }, 1000);
  } else if (msg.k === 'say') { const e = NET.entById[msg.eid]; if (e) say(e, msg.text); }
  else if (msg.k === 'sys') { sysLine(msg.text); }
  else if (msg.k === 'phase') { M.phase = msg.phase; M.timer = msg.timer; updateTimer(); if (msg.phase === 'vote') { $('meet-status').textContent = alive(G.player) ? 'VOTAÇÃO — toque em alguém ou pule' : 'VOTAÇÃO'; $('btn-skip').disabled = !alive(G.player); SFX.play('drum'); MUSIC.setMood('vote'); renderMeetPlayers(); } }
  else if (msg.k === 'vote') { M.votes.set(msg.voter, msg.target === 'skip' ? 'skip' : msg.target); if (msg.voter === G.player.id) M.playerVoted = true; SFX.play('drum'); renderMeetPlayers(); }
  else if (msg.k === 'end') {
    clearInterval(M.interval); M.interval = null; M.active = false; $('meeting').classList.add('hidden');
    const ej = msg.ejected ? NET.entById[msg.ejected] : null; if (ej && msg.role) ej.kind = msg.role;
    showEject(ej, () => { G.phase = 'play'; MUSIC.setMood(roleMood()); });
    if (ej === G.player) { $('ghost-note').textContent = '🔒 Você está na Jaula. Só observa.'; $('ghost-note').classList.remove('hidden'); }
  }
}
function guestEnd(msg) {
  for (const r of msg.roster) { const e = NET.entById[r.eid]; if (e) { e.kind = r.kind; e.alive = r.alive; e._sp = null; e._true = null; } }
  G.mode = 'free'; endGame(msg.winner);
}
