// ===== BRODS — revelação final (linha do tempo) e modo treino (tutorial) =====
'use strict';

// ---------- Linha do tempo ----------
function fmtT(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
function logEvent(icon, text, kind) { if (!G.events) G.events = []; G.events.push({ t: G.t, icon, text, kind: kind || 'info' }); }
function openTimeline() {
  const body = $('tl-body'); body.innerHTML = '';
  const roster = el('div', 'tl-roster');
  for (const e of G.entities) { const d = el('span', 'tl-chip role-' + e.kind); d.textContent = `${e.name}: ${ROLE_INFO[e.kind].title}`; roster.appendChild(d); }
  body.appendChild(roster);
  if (!G.events || !G.events.length) body.appendChild(el('p', 'mg-instr', 'Nada aconteceu… uma partida tranquila!'));
  for (const ev of G.events || []) {
    const row = el('div', 'tl-row ' + ev.kind);
    row.appendChild(el('span', 'tl-time', fmtT(ev.t)));
    row.appendChild(el('span', 'tl-ico', ev.icon));
    const tx = el('span', 'tl-text'); tx.textContent = ev.text; row.appendChild(tx);
    body.appendChild(row);
  }
  $('timeline').classList.remove('hidden');
}

// ---------- Modo treino ----------
const TUT = { active: false, step: -1, target: null, bodyDone: false };
function tutorialStart() {
  $('players-range').value = 6; renderCrowd();
  G.forceRole = 'venus'; G.tutorial = true;
  newGame();
}
function tutorialBegin() {
  TUT.active = true; TUT.step = 0; TUT.bodyDone = false;
  // só 3 missões pra aprender
  G.player.tasks = G.player.tasks.slice(0, 3); renderTaskList();
  tutorialSetStep(0);
}
function tutorialSetStep(n) {
  TUT.step = n; G.hintT = 9999;
  const touch = document.body.classList.contains('touch');
  const msgs = [
    touch ? '👋 Modo treino: use o joystick (lado esquerdo) para andar até a estação amarela.' : '👋 Modo treino: use as setas ou WASD para andar até a estação amarela.',
    touch ? '✅ Chegou! Toque em USAR para fazer a missão.' : '✅ Chegou! Aperte E para fazer a missão.',
    touch ? '☠ Um corpo! Chegue perto dele e toque em REPORTAR.' : '☠ Um corpo! Chegue perto dele e aperte R para reportar.',
    '🗣️ Na reunião: leia o que cada um diz, escreva o que viu e vote (ou pule). Os vilões mentem!',
    '🎉 Você aprendeu o básico! Agora é de verdade: termine as missões e desconfie de todo mundo.',
  ];
  showHint(msgs[n] || ''); SFX.play('tick');
  if (n === 4) { setTimeout(() => { if (TUT.active && TUT.step === 4) { TUT.active = false; hideHint(); toast('Modo treino concluído — boa sorte!'); } }, 7000); }
}
function tutorialUpdate(dt) {
  if (!TUT.active || G.phase !== 'play') return;
  const me = G.player;
  if (TUT.step === 0) {
    const t = me.tasks.find(t => !t.done); if (!t) { tutorialSetStep(4); return; }
    TUT.target = taskPos(TASK_BY_ID[t.id]);
    if (G.near && G.near.type === 'task') tutorialSetStep(1);
  } else if (TUT.step === 1) {
    if (me.tasks.some(t => t.done)) { tutorialSetStep(2); return; }
    if (!(G.near && G.near.type === 'task')) { tutorialSetStep(0); return; }
  } else if (TUT.step === 2) {
    if (!TUT.bodyDone) { tutorialKill(); TUT.bodyDone = true; }
    const b = G.bodies[0]; TUT.target = b ? { x: b.x, y: b.y } : null;
    if (!b) { tutorialSetStep(4); }
  } else if (TUT.step === 3) {
    // volta do meeting → passo 4
    tutorialSetStep(4);
  }
}
function tutorialKill() {
  const me = G.player; const demom = G.entities.find(e => e.kind === 'demom' && e.isBot) || G.entities.find(e => e.kind === 'chefe' && e.isBot); const victim = G.entities.find(e => e.isBot && e.kind === 'venus' && alive(e));
  if (!demom || !victim) return;
  // posiciona os dois a ~150px do jogador, num lugar andável
  let px = me.x + 150, py = me.y; if (!canStand(px, py, 16)) { px = me.x - 150; } if (!canStand(px, py, 16)) { px = me.x; py = me.y + 120; } if (!canStand(px, py, 16)) { px = me.x; py = me.y - 120; }
  victim.x = px; victim.y = py; demom.x = px + 30; demom.y = py; demom.killCd = 0;
  setTimeout(() => { if (G.phase === 'play') { killEntity(demom, victim); demom.ai.state = 'flee'; aiGoto(demom, randomPointIn(ROOMS[Math.floor(Math.random() * ROOMS.length)])); demom.ai.state = 'flee'; } }, 600);
}
function tutorialOnMeeting() { if (TUT.active && TUT.step === 2) { TUT.step = 3; hideHint(); setTimeout(() => { if (M.active) sysLine('💡 Treino: diga onde você estava e quem viu perto do corpo. Depois, toque em alguém para votar ou em "Pular voto".'); }, 1500); } }
function drawTutorialArrow() {
  if (!TUT.active || !TUT.target || TUT.step === 1 || TUT.step >= 3) return;
  const me = G.player; const t = TUT.target; const dx = t.x - me.x, dy = t.y - me.y, d = Math.hypot(dx, dy); if (d < 70) return;
  const ux = dx / d, uy = dy / d; const ax = me.x + ux * 70, ay = me.y - 30 + uy * 70; const bob = Math.sin(G.t * 6) * 6;
  ctx.save(); ctx.translate(ax + ux * bob, ay + uy * bob); ctx.rotate(Math.atan2(dy, dx));
  ctx.fillStyle = '#ffd300'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-8, -14); ctx.lineTo(-2, 0); ctx.lineTo(-8, 14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  // alvo
  const pulse = (Math.sin(G.t * 5) + 1) / 2; ctx.strokeStyle = `rgba(255,211,0,${.9 - pulse * .5})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(t.x, t.y + 8, 34 + pulse * 14, 16 + pulse * 7, 0, 0, 7); ctx.stroke();
}
