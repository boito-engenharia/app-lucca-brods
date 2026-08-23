// ===== BRODS — inteligência dos personagens do computador =====
'use strict';

// ---------- Navegação: grafo de retângulos andáveis + portas ----------
const NAV = { nodes: [], adj: new Map() };
function rectsTouch(a, b) { return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h; }
function doorBetween(a, b) {
  // ponto médio da faixa compartilhada
  const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w), y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}
function buildNav() {
  NAV.nodes = G.walk; NAV.adj = new Map();
  for (const a of NAV.nodes) { NAV.adj.set(a, []); for (const b of NAV.nodes) { if (a === b) continue; if (rectsTouch(a, b)) NAV.adj.get(a).push({ to: b, door: doorBetween(a, b) }); } }
}
function nodeAt(x, y) { for (const n of NAV.nodes) if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) return n; return null; }
function findPath(from, to) {
  const a = nodeAt(from.x, from.y), b = nodeAt(to.x, to.y); if (!a || !b) return [to];
  if (a === b) return [to];
  const prev = new Map([[a, null]]), q = [a];
  while (q.length) { const n = q.shift(); if (n === b) break; for (const e of NAV.adj.get(n)) if (!prev.has(e.to)) { prev.set(e.to, { n, door: e.door }); q.push(e.to); } }
  if (!prev.has(b)) return [to];
  const pts = []; let cur = b; while (prev.get(cur)) { const p = prev.get(cur); pts.unshift(p.door); cur = p.n; }
  pts.push(to); return pts;
}
function randomPointIn(rect) { return { x: rect.x + 40 + Math.random() * (rect.w - 80), y: rect.y + 40 + Math.random() * (rect.h - 80) }; }

// ---------- Percepção ----------
function othersNear(e, x, y, radius, except) { return G.entities.filter(o => o !== e && o !== except && alive(o) && Math.hypot(o.x - x, o.y - y) < radius); }
function playerCanSee(x, y) { const me = G.player; if (!alive(me) && !me.ghost) return false; if (!me.alive) return false; return Math.abs(me.x - x) < 560 && Math.abs(me.y - y) < 340; }

// ---------- Comportamento ----------
function aiGoto(e, pt) { e.ai.target = pt; e.ai.path = findPath(e, pt); e.ai.state = 'goto'; }
function aiPickTaskTarget(e) {
  const pend = e.tasks.filter(t => !t.done);
  if (e.kind === 'venus' && pend.length) { const t = pend[Math.floor(Math.random() * pend.length)]; const p = taskPos(TASK_BY_ID[t.id]); e.ai.task = t; aiGoto(e, { x: p.x, y: p.y }); return; }
  // vilão com ataque pronto: 60% das vezes vai atrás da vítima mais próxima (caça)
  if (e.kind !== 'venus' && e.killCd <= 0 && Math.random() < .6) {
    const prey = G.entities.filter(o => o !== e && alive(o) && !(e.kind === 'demom' && o.kind === 'demom')).sort((a, b) => dist(a, e) - dist(b, e))[0];
    if (prey) { e.ai.task = null; aiGoto(e, { x: prey.x, y: prey.y }); return; }
  }
  // vilão (ou venus sem missão): vaga entre cômodos fingindo
  e.ai.task = null; const r = ROOMS[Math.floor(Math.random() * ROOMS.length)]; const st = STATIONS[r.id]; const s = st[Math.floor(Math.random() * st.length)]; aiGoto(e, { x: s[0], y: s[1] });
}
function aiUpdate(e, dt) {
  if (e.kind === 'boss') return;
  const A = e.ai;
  aiSabotageTick(e, dt);
  // vilões: caçar se der
  if (e.kind !== 'venus' && e.killCd <= 0 && A.state !== 'flee') {
    const victim = aiFindVictim(e);
    if (victim) { if (A.state !== 'hunt' || A.victim !== victim) { A.state = 'hunt'; A.victim = victim; } }
    else if (A.state === 'hunt') { A.state = 'idle'; A.victim = null; }
  }
  if (A.state === 'hunt') {
    const v = A.victim;
    if (!v || !alive(v)) { A.state = 'idle'; return; }
    const d = dist(e, v);
    if (d < 44) {
      if (aiSafeToStrike(e, v)) { if (e.kind === 'demom') killEntity(e, v); else swallowEntity(e, v); A.state = 'flee'; A.wait = 0; const r = ROOMS[Math.floor(Math.random() * ROOMS.length)]; aiGoto(e, randomPointIn(r)); A.state = 'flee'; return; }
      A.state = 'idle'; A.victim = null; return;
    }
    // anda direto se está no mesmo retângulo, senão por caminho
    if (nodeAt(e.x, e.y) === nodeAt(v.x, v.y)) aiStep(e, v, dt); else { if (!A.path.length || A.pathT > 1) { A.path = findPath(e, v); A.pathT = 0; } A.pathT = (A.pathT || 0) + dt; aiFollow(e, dt); }
    return;
  }
  if (A.state === 'idle') { A.wait -= dt; if (A.wait <= 0) aiPickTaskTarget(e); else e.moving = false; return; }
  if (A.state === 'goto' || A.state === 'flee') {
    if (aiFollow(e, dt)) {
      if (A.state === 'flee') { A.state = 'idle'; A.wait = .5; return; }
      // chegou: faz a missão (ou finge); se veio consertar sabotagem, fica até resolver
      A.state = 'task'; A.wait = A.sabTask ? 999 : 2.5 + Math.random() * 2.5; e.moving = false;
    }
    return;
  }
  if (A.state === 'task') {
    e.moving = false; A.wait -= dt;
    if (A.wait <= 0) { if (A.task && e.kind === 'venus') completeTask(e, A.task); A.task = null; A.state = 'idle'; A.wait = .3 + Math.random(); }
  }
}
function aiStep(e, pt, dt) { const dx = pt.x - e.x, dy = pt.y - e.y, d = Math.hypot(dx, dy); if (d < 4) { e.moving = false; return true; } moveEntity(e, dx / d, dy / d, dt); return false; }
function aiFollow(e, dt) {
  const A = e.ai; if (!A.path.length) return true;
  const pt = A.path[0];
  const before = { x: e.x, y: e.y };
  if (aiStep(e, pt, dt)) { A.path.shift(); return A.path.length === 0; }
  // preso? dá um empurrão lateral
  if (Math.abs(e.x - before.x) < .05 && Math.abs(e.y - before.y) < .05) { A.stuck = (A.stuck || 0) + dt; if (A.stuck > .5) { const a = Math.random() * 7; const nx = e.x + Math.cos(a) * 20, ny = e.y + Math.sin(a) * 20; if (canStand(nx, ny, e.rad)) { e.x = nx; e.y = ny; } A.stuck = 0; A.path = findPath(e, A.target); } }
  else A.stuck = 0;
  return false;
}
function aiFindVictim(e) {
  if (TUT.active && TUT.step < 4) return null;
  // vítima: alguém vivo no mesmo cômodo, sem terceiros por perto e fora da vista do jogador
  let best = null, bd = 1e9;
  for (const v of G.entities) {
    if (v === e || !alive(v)) continue;
    if (e.kind === 'demom' && v.kind === 'demom') continue;
    const d = dist(e, v); if (d > 420) continue;
    if (nodeAt(e.x, e.y) !== nodeAt(v.x, v.y) && d > 160) continue;
    if (!aiSafeToStrike(e, v)) continue;
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
function aiSafeToStrike(e, v) {
  const witnesses = othersNear(e, v.x, v.y, 300, v);
  if (witnesses.length) return false;
  if (v !== G.player && playerCanSee(v.x, v.y) && alive(G.player)) return Math.random() < .04; // quase nunca ataca na frente do jogador
  return true;
}
function aiOnKill(killer, victim) {
  // testemunhas: bots vivos perto demais (raro, por causa do aiSafeToStrike) viram testemunhas
  for (const o of G.entities) { if (o === killer || o === victim || !alive(o) || !o.isBot) continue; if (dist(o, victim) < 330 && Math.random() < .8) o.ai.witness = { killer, victim, room: roomAt(victim.x, victim.y) }; }
  for (const o of G.entities) { if (o === killer || !alive(o)) continue; o.ai.lastRooms.push(roomAt(o.x, o.y) ? roomAt(o.x, o.y).id : null); }
}
function aiNoticeBodies(dt) {
  if (BOSS.active) return;
  for (const b of G.bodies) {
    for (const e of G.entities) {
      if (!e.isBot || !alive(e) || e.kind !== 'venus') continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < 140 && Math.random() < dt * 1.5) { startMeeting({ type: 'body', reporter: e, body: b }); return; }
    }
  }
}
