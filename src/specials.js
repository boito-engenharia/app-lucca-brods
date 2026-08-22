// ===== BRODS — cômodos especiais =====
'use strict';

const SPECIALS = [
  { id: 'book',   room: 'cozinha',     x: 2200, y: 630,  icon: '📖', name: 'Livro dos Mortos',        color: '185,140,255' },
  { id: 'eyes',   room: 'galeria',     x: 1700, y: 250,  icon: '👁️', name: 'Olhos dos quadros',       color: '255,120,120' },
  { id: 'potion', room: 'laboratorio', x: 1850, y: 1110, icon: '🧪', name: 'Poção de Escudo',         color: '120,255,200' },
  { id: 'altar',  room: 'capela',      x: 870,  y: 1000, icon: '✨', name: 'Altar da Segunda Chance', color: '255,230,120' },
  { id: 'cage',   room: 'porao',       x: 300,  y: 1160, icon: '🔒', name: 'Jaula',                   color: '200,200,220' },
];
const SP = { eyesCd: 0, potionUsed: false, altarUsed: false, bookReads: 0 };
const CAGE_POS = { x: 310, y: 1165 };

function specialsReset() { SP.eyesCd = 0; SP.potionUsed = false; SP.altarUsed = false; SP.bookReads = 0; }
function specialAvailable(sp) {
  const me = G.player;
  if (sp.id === 'book') return G.entities.some(e => !e.alive && !e.jailed) ? 'Ler o Livro dos Mortos' : null;
  if (sp.id === 'eyes') return SP.eyesCd <= 0 ? 'Olhar os quadros' : `Os quadros descansam (${Math.ceil(SP.eyesCd)}s)`;
  if (sp.id === 'potion') return SP.potionUsed ? null : me.shield ? null : 'Beber a Poção de Escudo';
  if (sp.id === 'altar') return (!SP.altarUsed && me.kind === 'venus' && G.entities.some(e => !e.alive && !e.jailed && !e.swallowed)) ? 'Usar o Altar (reviver 1)' : null;
  if (sp.id === 'cage') { const j = G.entities.find(e => e.jailed); return (j && me.kind === 'venus') ? `Soltar ${j.name} da Jaula (missão)` : null; }
  return null;
}
function specialsUpdate(dt) {
  if (SP.eyesCd > 0) SP.eyesCd -= dt;
  // histórico de cômodos (a cada 5 s)
  G.histT = (G.histT || 0) + dt;
  if (G.histT >= 5) { G.histT = 0; for (const e of G.entities) { if (!alive(e)) continue; const r = roomAt(e.x, e.y); e.hist = e.hist || []; e.hist.push(r ? r.id : null); if (e.hist.length > 8) e.hist.shift(); } }
}
function recordDeath(victim, killer) {
  const r = roomAt(victim.x, victim.y);
  const near = G.entities.filter(o => o !== victim && alive(o) && Math.hypot(o.x - victim.x, o.y - victim.y) < 350);
  victim.deathInfo = { room: r ? r.name : 'corredor', near: near.map(o => o.name), killer: killer ? killer.name : null, tasksDone: victim.tasks.filter(t => t.done).length, hist: (victim.hist || []).slice(-4), t: G.t };
}

function useSpecial(sp) {
  const me = G.player;
  if (sp.id === 'book') openBook();
  else if (sp.id === 'eyes') openEyes();
  else if (sp.id === 'potion') { SP.potionUsed = true; me.shield = true; SFX.play('ok'); toast('🧪 Você bebeu a Poção de Escudo! O próximo ataque contra você falha (mas sua boca ficou roxa…)'); }
  else if (sp.id === 'altar') openAltar();
  else if (sp.id === 'cage') { const j = G.entities.find(e => e.jailed); if (j) openMinigame({ icon: '🔒', name: 'Abrir a Jaula', game: 'toggleAll', p: { n: 5 } }, () => releaseJailed(j)); }
}

// ---------- Livro dos Mortos ----------
function openBook() {
  const me = G.player; const chefe = G.entities.find(e => e.kind === 'chefe' && alive(e) && e.isBot);
  // risco: o CHEFE na cozinha engole na hora
  if (chefe && Math.hypot(chefe.x - me.x, chefe.y - me.y) < 380 && me.kind !== 'chefe') { swallowEntity(chefe, me); toast('😱 O CHEFE estava na Cozinha e te engoliu!'); return; }
  G.inMinigame = true; SFX.play('open'); SP.bookReads++; MED.counters.reads = (MED.counters.reads || 0) + 1; saveMedals(); if (MED.counters.reads >= 3) unlockMedal('reader');
  const body = $('mg-body'); body.innerHTML = ''; body._cleanup = null; $('mg-title').textContent = '📖 Livro dos Mortos';
  body.appendChild(el('p', 'mg-instr', 'As páginas mostram quem já morreu. Toque em "Entrevistar" para ouvir a alma por 60 segundos.'));
  const dead = G.entities.filter(e => !e.alive && !e.jailed);
  for (const d of dead) {
    const row = el('div', 'book-row');
    const av = document.createElement('canvas'); av.width = 120; av.height = 70; const x = av.getContext('2d'); const S = spritesFor(d, false); const img = S.dead || S.front; if (img) { const w = 110, h = img.height * (w / img.width); x.drawImage(img, 5, 70 - h, w, h); }
    row.appendChild(av);
    const info = d.deathInfo || { room: '?', near: [], tasksDone: 0, hist: [] };
    const txt = el('div', 'book-txt', `<b style="color:${d.color.css}">${d.name}</b><br>${d.digested ? 'Digerido pelo CHEFE' : d.ejected ? 'Expulso' : 'Morto'} ${info.room ? 'em: ' + info.room : ''}<br>Missões feitas: ${info.tasksDone}<br>Esteve em: ${(info.hist || []).filter(Boolean).map(id => ROOM_BY_ID[id].name).join(' → ') || '?'}`);
    row.appendChild(txt);
    const b = el('button', 'small-btn', 'Entrevistar'); b.onclick = () => { b.disabled = true; const lines = ghostLines(d); const box = el('div', 'book-say'); txt.appendChild(box); let i = 0; const show = () => { if (i < lines.length) { const p = el('div', '', '👻 ' + lines[i++]); box.appendChild(p); setTimeout(show, 1400); } }; show(); };
    row.appendChild(b); body.appendChild(row);
  }
  let left = 60; const tm = el('div', 'mg-code', '60 s'); body.appendChild(tm);
  const t = setInterval(() => { left--; tm.textContent = left + ' s'; if (left <= 0) { clearInterval(t); closeMinigame(); } }, 1000);
  body._cleanup = () => clearInterval(t);
  $('minigame').classList.remove('hidden');
}
function ghostLines(d) {
  const info = d.deathInfo; if (!info) return ['Não lembro de nada…'];
  const L = [];
  L.push(`Quando morri eu estava em: ${info.room}.`);
  if (info.near.length) { const names = info.near.filter(n => n !== info.killer); const showKiller = info.killer && Math.random() < .6; const list = [...names]; if (showKiller) list.push(info.killer); if (list.length) L.push(`Perto de mim estavam: ${list.join(', ')}.`); else L.push('Tinha alguém por perto, mas não vi direito quem era…'); if (info.killer && !showKiller) L.push('Quem me atacou veio por trás… não vi o rosto.'); }
  else L.push('Eu estava sozinho. Quem me pegou foi rápido demais…');
  if (d.ejected) L.splice(0, L.length, 'Vocês me expulsaram! Eu era inocente…');
  return L;
}

// ---------- Olhos da Galeria ----------
function openEyes() {
  G.inMinigame = true; SFX.play('open'); SP.eyesCd = 45;
  const body = $('mg-body'); body.innerHTML = ''; body._cleanup = null; $('mg-title').textContent = '👁️ Os quadros viram tudo';
  body.appendChild(el('p', 'mg-instr', 'Os olhos dos quadros contam por onde cada um passou nos últimos instantes. Mas cuidado: UM dos quadros mente.'));
  const others = G.entities.filter(e => e !== G.player && alive(e));
  const liar = others[Math.floor(Math.random() * others.length)];
  for (const e of others) {
    let rooms = (e.hist || []).slice(-5).filter(Boolean).map(id => ROOM_BY_ID[id].name);
    const cur = roomAt(e.x, e.y); if (cur) rooms.push(cur.name);
    rooms = rooms.filter((r, i, a) => i === 0 || r !== a[i - 1]);
    if (e === liar) { const fake = ROOMS[Math.floor(Math.random() * ROOMS.length)].name; rooms = rooms.length ? [fake, ...rooms.slice(1)] : [fake]; }
    const row = el('div', 'book-row');
    const av = avatarCanvas(e, false); av.style.width = '40px'; av.style.height = '40px'; row.appendChild(av);
    row.appendChild(el('div', 'book-txt', `<b style="color:${e.color.css}">${e.name}</b>: ${rooms.join(' → ') || 'ninguém viu'}`));
    body.appendChild(row);
  }
  $('minigame').classList.remove('hidden');
}

// ---------- Altar ----------
function openAltar() {
  G.inMinigame = true; SFX.play('open');
  const body = $('mg-body'); body.innerHTML = ''; body._cleanup = null; $('mg-title').textContent = '✨ Altar da Segunda Chance';
  body.appendChild(el('p', 'mg-instr', 'Escolha UMA alma para trazer de volta. O sino vai tocar e a mansão inteira vai ouvir…'));
  const row = el('div', 'mg-row'); body.appendChild(row);
  for (const d of G.entities.filter(e => !e.alive && !e.jailed && !e.swallowed)) {
    const b = el('button', 'small-btn', d.name); b.style.background = d.color.css; b.onclick = () => { revive(d); closeMinigame(); }; row.appendChild(b);
  }
  $('minigame').classList.remove('hidden');
}
function revive(d) {
  SP.altarUsed = true; d.alive = true; d.ghost = false; d.digested = false; d.swallowed = false; d.x = 870; d.y = 1060; d.speed = d.isBot ? SETTINGS.botSpeed : SETTINGS.playerSpeed;
  if (d.isBot) { d.ai.state = 'idle'; d.ai.wait = 1; d.ai.witness = null; } else { $('ghost-note').classList.add('hidden'); toast('Você voltou à vida!'); }
  G.bodies = G.bodies.filter(b => b.ent !== d); spawnFx(d.x, d.y - 30, '#ffd300', 24, 150, 1);
  SFX.play('bell'); toast(`✨ ${d.name} voltou à vida! O sino tocou na Capela…`); renderTaskList(); unlockMedal('reviver');
  // vilões ouvem o sino e vão até a Capela
  for (const e of G.entities) if (e.isBot && alive(e) && e.kind !== 'venus') { aiGoto(e, { x: 800, y: 1100 }); e.ai.state = 'goto'; }
  if (G.player.kind !== 'venus') toast('🔔 O sino tocou na Capela! Alguém usou o Altar…');
}

// ---------- Jaula ----------
function jailEntity(e) { e.jailed = true; e.alive = false; e.ghost = false; e.moving = false; e.x = CAGE_POS.x + (Math.random() - .5) * 40; e.y = CAGE_POS.y + (Math.random() - .5) * 20; }
function releaseJailed(e) {
  e.jailed = false; e.alive = true; e.ghost = false; e.ejected = false; e.x = 300; e.y = 1050;
  if (e.isBot) { e.ai.state = 'idle'; e.ai.wait = 1; } else { $('ghost-note').classList.add('hidden'); toast('Você foi solto da Jaula!'); }
  SFX.play('ok'); toast(`🔓 ${e.name} foi solto da Jaula!`); renderTaskList(); checkWin();
}

// ---------- Desenho ----------
function drawSpecials() {
  for (const sp of SPECIALS) {
    const pulse = (Math.sin(G.t * 3 + sp.x) + 1) / 2;
    ctx.fillStyle = `rgba(${sp.color},${.18 + .18 * pulse})`; ctx.beginPath(); ctx.arc(sp.x, sp.y, 28 + pulse * 3, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${sp.color},.9)`; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(sp.icon, sp.x, sp.y + 1); ctx.textBaseline = 'alphabetic';
    ctx.font = '900 11px Nunito, Arial'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(sp.name.toUpperCase(), sp.x, sp.y + 44);
  }
  // jaula: barras por cima dos presos
  const jailed = G.entities.filter(e => e.jailed);
  if (jailed.length) { ctx.strokeStyle = '#bbb'; ctx.lineWidth = 4; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(CAGE_POS.x + i * 16, CAGE_POS.y - 70); ctx.lineTo(CAGE_POS.x + i * 16, CAGE_POS.y + 14); ctx.stroke(); } }
}
