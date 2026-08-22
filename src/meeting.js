// ===== BRODS — reunião, conversa e votação =====
'use strict';

const M = { active: false, phase: 'talk', timer: 0, votes: new Map(), info: null, suspicion: new Map(), accusations: [], interval: null, talkTimers: [], playerVoted: false };

function startMeeting(info) {
  if (G.phase !== 'play' || M.active) return;
  M.active = true; M.info = info; M.votes = new Map(); M.suspicion = new Map(); M.accusations = []; M.playerVoted = false; M.talkTimers = [];
  closeMinigame(); hideHint(); if (SAB.active) endSabotage(''); $('prompt2').classList.add('hidden'); G.phase = 'meeting'; SFX.play('alarm'); MUSIC.setMood('meeting');
  // onde cada um estava
  for (const e of G.entities) { const r = roomAt(e.x, e.y); e.roomAtMeeting = r ? r.id : null; }
  // teleporta os vivos para o Salão
  const liv = G.entities.filter(e => alive(e));
  liv.forEach((e, i) => { const a = (i / liv.length) * Math.PI * 2; e.x = 1020 + Math.cos(a) * 130; e.y = 620 + Math.sin(a) * 95; e.moving = false; e.facing = 'down'; if (e.isBot) { e.ai.state = 'idle'; e.ai.wait = 1 + Math.random() * 2; e.ai.path = []; } if (e.kind !== 'venus') e.killCd = Math.max(e.killCd, 12); });
  G.bodies = []; G.meetingCd = 15; G.near = null; $('prompt').classList.add('hidden');
  // UI
  const v = info.body ? info.body.ent : null;
  $('meet-title').textContent = info.type === 'body' ? (v === G.player ? `☠ O seu corpo foi encontrado por ${info.reporter.name}` : `☠ Corpo de ${v.name} encontrado por ${nm(info.reporter)}`) : `🚨 Reunião de emergência — ${info.reporter.name}`;
  $('chat-log').innerHTML = '';
  sysLine(info.type === 'body' ? `${nm(info.reporter, true)} achou o corpo de ${nm(v)} ${info.body.room ? 'em: ' + info.body.room.name : 'no corredor'}.` : `${nm(info.reporter, true)} apertou o botão de emergência.`);
  const me = G.player; const canTalk = alive(me);
  $('chat-input').disabled = !canTalk; $('chat-send').disabled = !canTalk; $('chat-input').placeholder = canTalk ? 'Digite o que quer dizer… (ex: eu vi o Azul na Cozinha)' : 'Fantasmas não falam…';
  $('btn-skip').disabled = true;
  renderMeetPlayers();
  M.phase = 'talk'; M.timer = SETTINGS.discussionTime; $('meet-status').textContent = 'Discussão'; updateTimer();
  $('meeting').classList.remove('hidden');
  scheduleBotTalk();
  clearInterval(M.interval);
  M.interval = setInterval(meetTick, 1000);
}
function updateTimer() { $('meet-timer').textContent = M.timer; }
function meetTick() {
  M.timer--; updateTimer();
  if (M.phase === 'talk' && M.timer <= 0) { M.phase = 'vote'; M.timer = SETTINGS.voteTime; $('meet-status').textContent = alive(G.player) ? 'VOTAÇÃO — toque em alguém ou pule' : 'VOTAÇÃO'; $('btn-skip').disabled = !alive(G.player); SFX.play('drum'); MUSIC.setMood('vote'); renderMeetPlayers(); scheduleBotVotes(); }
  else if (M.phase === 'vote') {
    const voters = G.entities.filter(e => alive(e)); const allVoted = voters.every(e => M.votes.has(e.id));
    if (M.timer <= 0 || allVoted) { clearInterval(M.interval); M.interval = null; finishVote(); }
  }
}
function sysLine(t) { const d = document.createElement('div'); d.className = 'bub sys'; d.textContent = t; $('chat-log').appendChild(d); $('chat-log').scrollTop = 1e9; }
function say(e, text) {
  const d = document.createElement('div'); d.className = 'bub' + (e === G.player ? ' me' : '');
  const b = document.createElement('b'); b.textContent = e.name + ':'; b.style.color = e === G.player ? '#ffd300' : e.color.css; d.appendChild(b); d.appendChild(document.createTextNode(text));
  $('chat-log').appendChild(d); $('chat-log').scrollTop = 1e9; SFX.play('tick');
}
function renderMeetPlayers() {
  const box = $('meet-players'); box.innerHTML = '';
  const me = G.player;
  for (const e of G.entities) {
    const d = document.createElement('div'); d.className = 'mp' + (alive(e) ? '' : ' dead') + (e === me ? ' me' : '');
    d.appendChild(avatarCanvas(e, e === me && e.kind !== 'venus'));
    const n = document.createElement('span'); n.className = 'nm'; n.textContent = e.name + (e.swallowed ? ' (na barriga)' : e.jailed ? ' (na jaula)' : ''); n.style.color = e.color.css; d.appendChild(n);
    if (M.info && M.info.reporter === e) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'reportou'; d.appendChild(t); }
    const vs = document.createElement('span'); vs.className = 'votes'; for (const [vid, target] of M.votes) if (target === e.id) { const i = document.createElement('i'); const voter = G.entities.find(z => z.id === vid); i.style.background = voter ? voter.color.css : '#fff'; vs.appendChild(i); } d.appendChild(vs);
    if (M.phase === 'vote' && alive(e) && alive(me) && !M.playerVoted) { d.classList.add('votable'); d.onclick = () => castVote(me, e.id); }
    if (M.votes.get(me.id) === e.id) d.classList.add('voted');
    box.appendChild(d);
  }
}
function castVote(voter, targetId) {
  if (M.phase !== 'vote' || M.votes.has(voter.id)) return;
  M.votes.set(voter.id, targetId); if (targetId === G.player.id && voter !== G.player) G.votesAgainstMe = (G.votesAgainstMe || 0) + 1;
  if (voter === G.player) { M.playerVoted = true; $('btn-skip').disabled = true; sysLine(targetId === 'skip' ? 'Você pulou o voto.' : 'Você votou em ' + G.entities.find(e => e.id === targetId).name + '.'); }
  SFX.play('drum'); renderMeetPlayers();
}
$('btn-skip').addEventListener('click', () => castVote(G.player, 'skip'));
$('chat-send').addEventListener('click', playerSays);
$('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); playerSays(); } e.stopPropagation(); });

// ---------- Fala do jogador e reações ----------
function playerSays() {
  const inp = $('chat-input'); const text = inp.value.trim(); if (!text || !alive(G.player) || !M.active) return; inp.value = '';
  say(G.player, text);
  const low = text.toLowerCase();
  const named = G.entities.filter(e => e !== G.player && low.includes(e.name.toLowerCase()));
  const roomsNamed = ROOMS.filter(r => low.includes(r.name.toLowerCase().split(' ')[0]));
  const accusing = /(foi|acuso|suspeit|desconf|matou|mentir|culpad|vi o|vi a|estranho|votem|vota)/.test(low);
  const defending = /(não fui|nao fui|inocente|eu estava|tava)/.test(low) && !named.length;
  if (named.length && accusing) {
    for (const x of named) { M.accusations.push({ by: G.player, who: x }); bump(x, 40); }
    const x = named[0];
    setTimeout(() => { if (!M.active) return; if (x.isBot && alive(x)) { if (x.kind === 'venus') say(x, pick([`Eu?! Não fui eu! Eu estava ${placeOf(x)}.`, `Que isso, eu sou inocente! Eu estava ${placeOf(x)}.`, `Não fui eu! Alguém me viu ${placeOf(x)}?`])); else say(x, pick([`Mentira! Eu estava ${fakePlace(x)}. Desconfio é de você!`, `Eu?? Você que está estranho… eu estava ${fakePlace(x)}.`, `Prova? Eu estava ${fakePlace(x)} o tempo todo!`])); } }, 900);
    // outros reagem
    const others = G.entities.filter(e => e.isBot && alive(e) && e !== x);
    others.slice(0, 3).forEach((o, i) => setTimeout(() => { if (!M.active) return; if (o.kind !== 'venus') { say(o, pick([`Também achei o ${x.name} estranho.`, `Pode ser o ${x.name} mesmo…`])); bump(x, 10); return; } if (Math.random() < SETTINGS.botTrust) { say(o, pick([`Hmm, o ${x.name} estava estranho mesmo…`, `Eu vi o ${x.name} andando sozinho também.`, `Faz sentido… voto no ${x.name}.`])); o.ai.trustAcc = x; } else say(o, pick([`Tem certeza? Você tem prova?`, `Eu não vi nada disso.`, `Hmm, não sei não…`])); }, 1800 + i * 1200));
  } else if (named.length && roomsNamed.length) {
    const x = named[0], r = roomsNamed[0]; bump(x, 15);
    setTimeout(() => { if (M.active && x.isBot && alive(x)) say(x, x.roomAtMeeting === r.id ? `É, eu passei ${prep(r)} ${r.name} fazendo missão.` : `Eu não estava ${prep(r)} ${r.name}! Você se confundiu.`); }, 900);
  } else if (defending) {
    const o = pick(G.entities.filter(e => e.isBot && alive(e))); if (o) setTimeout(() => { if (M.active) say(o, pick(['Tá bom, acredito.', 'Hmm… vamos ver.', 'Então quem foi?'])); }, 900);
  } else if (/(quem|algu[eé]m viu|alguem viu|onde)/.test(low)) {
    const o = pick(G.entities.filter(e => e.isBot && alive(e))); if (o) setTimeout(() => { if (M.active) say(o, o.ai.witness ? `Eu vi! Foi o ${o.ai.witness.killer.name}!` : pick([`Eu não vi nada, estava ${placeOf(o)}.`, `Não vi ninguém por perto.`, `Eu estava ${placeOf(o)} o tempo todo.`])); }, 900);
  } else {
    const o = pick(G.entities.filter(e => e.isBot && alive(e))); if (o && Math.random() < .7) setTimeout(() => { if (M.active) say(o, pick(['Hmm.', 'Entendi.', 'Será?', 'Vamos com calma.', 'Alguém tem certeza de algo?'])); }, 800);
  }
}
function bump(e, n) { M.suspicion.set(e.id, (M.suspicion.get(e.id) || 0) + n); }
function nm(e, cap) { if (e === G.player) return cap ? 'Você' : 'você'; return e.name; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function prep(r) { return ['jardim', 'porao', 'sotao', 'salao', 'quarto', 'laboratorio'].includes(r.id) ? 'no' : 'na'; }
function placeOf(e) { const r = ROOM_BY_ID[e.roomAtMeeting]; return r ? `${prep(r)} ${r.name}` : 'no corredor'; }
function fakePlace(e) { const opts = ROOMS.filter(r => r.id !== e.roomAtMeeting); const r = pick(opts); return `${prep(r)} ${r.name}`; }

// ---------- Falas dos bots ----------
function scheduleBotTalk() {
  const bots = G.entities.filter(e => e.isBot && alive(e)); const info = M.info; const victim = info.body ? info.body.ent : null; const bodyRoom = info.body && info.body.room ? info.body.room.id : null;
  let t = 1200;
  const add = (fn, delay) => M.talkTimers.push(setTimeout(() => { if (M.active && M.phase === 'talk') fn(); }, delay));
  // reporter bot
  if (info.reporter.isBot) add(() => say(info.reporter, info.type === 'body' ? pick([`Achei o corpo ${info.body.room ? prep(info.body.room) + ' ' + info.body.room.name : 'no corredor'}! Não tinha ninguém por perto.`, `Gente, ${victim === G.player ? 'você' : 'o ' + victim.name} está morto ${info.body.room ? prep(info.body.room) + ' ' + info.body.room.name : 'no corredor'}!`]) : 'Chamei porque vi algo estranho.'), t), t += 1500;
  // testemunhas
  for (const b of bots) if (b.ai.witness && alive(b.ai.witness.killer)) { const w = b.ai.witness; add(() => { say(b, pick([`EU VI! O ${w.killer.name} atacou ${w.victim === G.player ? 'você' : 'o ' + w.victim.name}${w.room ? ' ' + prep(w.room) + ' ' + w.room.name : ''}!`, `Foi o ${w.killer.name}! Eu vi com esses olhos!`])); M.accusations.push({ by: b, who: w.killer }); bump(w.killer, 60); }, t); t += 1600; }
  // quem estava no cômodo do corpo
  if (bodyRoom) for (const b of bots) { if (b === info.reporter || b.ai.witness) continue; if (b.roomAtMeeting === bodyRoom && b.kind === 'venus' && Math.random() < .8) { add(() => say(b, pick([`Eu estava ${prep(ROOM_BY_ID[bodyRoom])} ${ROOM_BY_ID[bodyRoom].name} também, mas não vi nada…`, `Passei por lá agora há pouco e estava tudo normal!`])), t); t += 1500; } }
  // genéricos
  const rest = bots.filter(b => !b.ai.witness && b !== info.reporter).sort(() => Math.random() - .5).slice(0, 4);
  for (const b of rest) {
    add(() => {
      if (b.kind === 'venus') { const others = G.entities.filter(o => o !== b && alive(o)); const s = pick(others); const r = Math.random(); if (r < .45) say(b, pick([`Eu estava ${placeOf(b)} fazendo missão.`, `Não vi nada suspeito, estava ${placeOf(b)}.`, `Alguém viu alguma coisa?`])); else if (r < .65 && s) { say(b, pick([`Estou desconfiado do ${s.name}, estava sozinho.`, `O ${s.name} sumiu por um tempo…`])); M.accusations.push({ by: b, who: s }); bump(s, 12); } else say(b, pick(['Vamos pular, não tem prova.', 'Cuidado pra não expulsar um inocente!', 'Fiquem em dupla, é mais seguro.'])); }
      else { const vens = G.entities.filter(o => o !== b && alive(o) && o.kind === 'venus' && o !== G.player); const s = pick(vens) || pick(G.entities.filter(o => o !== b && alive(o))); const r = Math.random(); if (r < .5) say(b, pick([`Eu estava ${fakePlace(b)} fazendo missão.`, `Não vi nada, estava ${fakePlace(b)}.`])); else if (s) { say(b, pick([`Acho que foi o ${s.name}, ele estava sozinho.`, `O ${s.name} estava estranho perto de lá…`])); M.accusations.push({ by: b, who: s }); bump(s, 12); } }
    }, t); t += 1500 + Math.random() * 800;
  }
}

// ---------- Votos dos bots ----------
function scheduleBotVotes() {
  const bots = G.entities.filter(e => e.isBot && alive(e));
  const bodyRoom = M.info.body && M.info.body.room ? M.info.body.room.id : null;
  bots.forEach((b, i) => M.talkTimers.push(setTimeout(() => { if (!M.active || M.phase !== 'vote' || M.votes.has(b.id)) return; castVote(b, botChoice(b, bodyRoom)); }, 2000 + Math.random() * (SETTINGS.voteTime * 1000 - 6000))));
}
function botChoice(b, bodyRoom) {
  const cands = G.entities.filter(e => e !== b && alive(e));
  if (b.ai.witness && alive(b.ai.witness.killer)) return b.ai.witness.killer.id;
  const score = new Map();
  for (const c of cands) {
    let s = (M.suspicion.get(c.id) || 0) * (b.kind === 'venus' ? 1 : .6);
    if (b.ai.trustAcc === c) s += 30;
    if (bodyRoom && c.roomAtMeeting === bodyRoom) s += 12;
    if (M.info.reporter === c && Math.random() < .25) s += 15;
    s += Math.random() * 14;
    if (b.kind !== 'venus' && c.kind !== 'venus') s -= 100;   // vilões não votam um no outro (ainda)
    if (b.kind !== 'venus' && M.accusations.some(a => a.by === c && a.who === b)) s += 40; // vilão revida quem acusou
    score.set(c, s);
  }
  let best = null, bs = -1; for (const [c, s] of score) if (s > bs) { bs = s; best = c; }
  if (b.kind !== 'venus' && bs < 30 && Math.random() < .5) return best.id;
  return bs >= 30 ? best.id : 'skip';
}

// ---------- Resultado ----------
function finishVote() {
  M.talkTimers.forEach(clearTimeout); M.talkTimers = [];
  const tally = new Map(); for (const [, t] of M.votes) tally.set(t, (tally.get(t) || 0) + 1);
  let best = null, bc = 0, tie = false; for (const [t, c] of tally) { if (c > bc) { best = t; bc = c; tie = false; } else if (c === bc) tie = true; }
  const ejected = (best && best !== 'skip' && !tie) ? G.entities.find(e => e.id === best) : null;
  $('meeting').classList.add('hidden'); M.active = false;
  showEject(ejected, () => {
    if (ejected) {
      if (!G.firstEjectRole) { G.firstEjectRole = ejected.kind; G.myFirstVoteHit = M.votes.get(G.player.id) === ejected.id; }
      ejected.ejected = true; jailEntity(ejected); recordDeath(ejected, null);
      if (ejected.kind === 'chefe') releaseBelly(ejected);
      if (ejected === G.player) { hideHint(); toast('Você foi expulso e está na Jaula do Porão. Se os VENUS perceberem o erro, podem te soltar…'); $('ghost-note').textContent = '🔒 Você está na Jaula. Só observa — a menos que alguém te solte.'; $('ghost-note').classList.remove('hidden'); MUSIC.setMood('dark'); }
    }
    G.phase = 'play'; MUSIC.setMood(roleMood());
    checkWin();
  });
}
function showEject(e, cb) {
  const card = $('eject'); SFX.play('eject');
  if (e) { $('eject-img').src = SPRITE_DATA[e.kind + '_front']; $('eject-img').classList.remove('hidden'); $('eject-text').textContent = `${e.name} foi expulso${e.name === 'Você' ? '' : ''}. ${SETTINGS.revealRole ? (e.name === 'Você' ? 'Você era' : e.name + ' era') + ' ' + ROLE_INFO[e.kind].title + (e.kind === 'venus' ? ' 😢' : ' 😈') : ''}`; }
  else { $('eject-img').classList.add('hidden'); $('eject-text').textContent = 'Ninguém foi expulso (empate ou pulo).'; }
  card.classList.remove('hidden');
  setTimeout(() => { card.classList.add('hidden'); cb(); }, 3200);
}
