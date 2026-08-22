// ===== BRODS — motores de minijogo =====
// Cada motor: function(body, done, p) — desenha dentro de `body`, chama done() ao terminar. p = parâmetros da missão.

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function rnd(n) { return Math.floor(Math.random() * n); }
function finish(body, done, msg) { body.appendChild(el('div', 'mg-ok', msg || '✔ Missão concluída!')); SFX.play('ok'); setTimeout(done, 650); }
function wrong(e) { e.classList.add('wrong'); setTimeout(() => e.classList.remove('wrong'), 300); SFX.play('bad'); }
const PAL = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#f1c40f', '#16a085', '#e84393'];

const MINIGAMES = {

  // Toque nos itens em ordem (1..n)
  tapOrder(body, done, p) {
    const n = p.n || 5, kind = p.kind || 'book';
    const label = { book: 'livros', star: 'estrelas', barrel: 'barris', box: 'caixas' }[kind] || 'itens';
    body.appendChild(el('p', 'mg-instr', `Toque nos ${label} na ordem certa: 1, 2, 3…`));
    const row = el('div', 'mg-row'); body.appendChild(row);
    let next = 1;
    shuffle(Array.from({ length: n }, (_, i) => i + 1)).forEach(i => {
      const b = el('div', 'mg-tile' + (kind === 'book' ? ' mg-book' : ''), kind === 'star' ? '⭐' + i : kind === 'barrel' ? '🛢️' + i : kind === 'box' ? '📦' + i : String(i));
      if (kind === 'book') b.style.background = PAL[(i - 1) % PAL.length];
      b.onclick = () => { if (i === next) { b.classList.add('done'); next++; SFX.play('tick'); if (next > n) finish(body, done); } else wrong(b); };
      row.appendChild(b);
    });
  },

  // Ligar fios por cor
  wires(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Ligue cada fio à cor igual: toque em um da esquerda e depois no da direita.'));
    const wrap = el('div', 'mg-wire'); body.appendChild(wrap);
    const L = el('div', 'col'), R = el('div', 'col'); wrap.appendChild(L); wrap.appendChild(R);
    const colors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'];
    let sel = null, doneCount = 0;
    shuffle(colors).forEach(c => { const d = el('div', 'mg-dot'); d.style.background = c; d.dataset.c = c; d.onclick = () => { L.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); d.classList.add('sel'); sel = d; SFX.play('tick'); }; L.appendChild(d); });
    shuffle(colors).forEach(c => { const d = el('div', 'mg-dot'); d.style.background = c; d.onclick = () => { if (!sel) return; if (sel.dataset.c === c) { sel.classList.add('done'); d.classList.add('done'); sel.classList.remove('sel'); sel = null; doneCount++; SFX.play('tick'); if (doneCount === 4) finish(body, done); } else wrong(d); }; R.appendChild(d); });
  },

  // Receita da poção
  pocao(body, done) {
    const seqColors = [['#e74c3c', '🔴'], ['#3498db', '🔵'], ['#2ecc71', '🟢'], ['#f1c40f', '🟡']];
    const target = Array.from({ length: 3 }, () => rnd(4));
    body.appendChild(el('p', 'mg-instr', 'A receita da poção é: ' + target.map(i => seqColors[i][1]).join(' → ') + '. Toque nos frascos nessa ordem.'));
    const row = el('div', 'mg-row'); body.appendChild(row);
    let pos = 0;
    seqColors.forEach(([c, emo], i) => { const t = el('div', 'mg-tile', emo); t.style.background = c; t.onclick = () => { if (target[pos] === i) { pos++; SFX.play('tick'); t.classList.add('sel'); setTimeout(() => t.classList.remove('sel'), 200); if (pos === 3) finish(body, done, '✔ Poção pronta!'); } else { pos = 0; wrong(t); } }; row.appendChild(t); });
  },

  // Alinhar com slider
  alignSlider(body, done, p) {
    const target = 15 + rnd(70);
    body.appendChild(el('p', 'mg-instr', (p.label || 'Alinhe o alvo na mira') + ' e segure por um instante.'));
    const view = el('div', 'mg-meter'); view.style.height = '70px'; body.appendChild(view);
    const obj = el('div', '', p.emoji || '🌕'); obj.style.cssText = `position:absolute;top:12px;font-size:36px;left:${target}%;transform:translateX(-50%)`; view.appendChild(obj);
    const cross = el('div', ''); cross.style.cssText = 'position:absolute;top:0;bottom:0;left:50%;width:4px;margin-left:-2px;background:#ffd300'; view.appendChild(cross);
    const s = el('input', 'mg-slider'); s.type = 'range'; s.min = 0; s.max = 100; s.value = 50; body.appendChild(s);
    let hold = 0; const t = setInterval(() => { const pos = 50 + (target - (+s.value)); obj.style.left = pos + '%'; if (Math.abs(pos - 50) < 3) { hold++; if (hold > 25) { clearInterval(t); finish(body, done); } } else hold = 0; }, 40);
    body._cleanup = () => clearInterval(t);
  },

  // Sequência (genius): velas, teclas ou azulejos
  simon(body, done, p) {
    const n = p.n || 4, kind = p.kind || 'candle';
    body.appendChild(el('p', 'mg-instr', kind === 'candle' ? 'Veja as velas piscarem e acenda na mesma ordem.' : 'Veja a ordem e repita.'));
    const row = el('div', 'mg-row'); row.style.marginTop = '30px'; body.appendChild(row);
    const count = p.emojis ? p.emojis.length : 4;
    const seq = Array.from({ length: n }, () => rnd(count));
    const items = Array.from({ length: count }, (_, i) => { const c = kind === 'candle' ? el('div', 'mg-candle') : el('div', 'mg-tile', p.emojis ? p.emojis[i] : ''); if (kind !== 'candle') c.style.background = PAL[i]; row.appendChild(c); return c; });
    let showing = true, pos = 0;
    const show = (i) => { if (i >= seq.length) { showing = false; return; } const c = items[seq[i]]; c.classList.add('flash', 'lit', 'sel'); SFX.play('tick'); setTimeout(() => { c.classList.remove('flash', 'lit', 'sel'); setTimeout(() => show(i + 1), 250); }, 500); };
    setTimeout(() => show(0), 500);
    items.forEach((c, i) => c.onclick = () => { if (showing) return; if (seq[pos] === i) { c.classList.add('lit'); pos++; SFX.play('tick'); if (pos === seq.length) finish(body, done); } else { items.forEach(x => x.classList.remove('lit')); pos = 0; wrong(c); } });
  },

  // Colocar cada item no lugar certo
  slots(body, done, p) {
    const items = p.items;
    body.appendChild(el('p', 'mg-instr', 'Toque em um item e depois no lugar dele.'));
    const slots = el('div', 'mg-row'); body.appendChild(slots);
    const bag = el('div', 'mg-row'); bag.style.marginTop = '16px'; body.appendChild(bag);
    let sel = null, n = 0;
    items.forEach(([emo, name]) => { const s = el('div', 'mg-slot', `<small style="font-size:12px">${name}</small>`); s.onclick = () => { if (sel && sel.dataset.n === name) { s.innerHTML = emo; s.classList.add('filled'); sel.remove(); sel = null; n++; SFX.play('tick'); if (n === items.length) finish(body, done); } else if (sel) wrong(s); }; slots.appendChild(s); });
    shuffle(items).forEach(([emo, name]) => { const t = el('div', 'mg-tile', emo); t.dataset.n = name; t.onclick = () => { bag.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); t.classList.add('sel'); sel = t; SFX.play('tick'); }; bag.appendChild(t); });
  },

  // Segurar o botão
  hold(body, done, p) {
    body.appendChild(el('p', 'mg-instr', 'Segure o botão até a barra encher.'));
    const btn = el('button', 'mg-hold', (p.emoji || '') + ' ' + (p.label || 'SEGURE')); body.appendChild(btn);
    const bar = el('div', 'mg-progress'); const fill = el('div'); bar.appendChild(fill); body.appendChild(bar);
    let v = 0, holding = false;
    const start = (e) => { e.preventDefault(); holding = true; }, stop = () => { holding = false; };
    btn.addEventListener('pointerdown', start); btn.addEventListener('pointerup', stop); btn.addEventListener('pointerleave', stop); btn.addEventListener('pointercancel', stop);
    const t = setInterval(() => { v += holding ? 2.2 : -1.2; v = Math.max(0, Math.min(100, v)); fill.style.width = v + '%'; if (holding && Math.random() < .2) SFX.play('tick'); if (v >= 100) { clearInterval(t); finish(body, done); } }, 50);
    body._cleanup = () => clearInterval(t);
  },

  // Endireitar quadros
  quadros(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Toque nos quadros tortos até ficarem retos.'));
    const row = el('div', 'mg-row'); row.style.marginTop = '10px'; body.appendChild(row);
    let left = 0;
    ['#b33', '#36b', '#3a3', '#a6a', '#da3'].forEach(c => { const tilt = Math.random() < .75 ? (Math.random() < .5 ? -1 : 1) * (12 + rnd(15)) : 0; if (tilt) left++; const q = el('div', 'mg-paint'); q.style.background = c; q.style.transform = `rotate(${tilt}deg)`; q.dataset.t = tilt; q.onclick = () => { if (+q.dataset.t === 0) return; q.dataset.t = 0; q.style.transform = 'rotate(0deg)'; left--; SFX.play('tick'); if (left === 0) finish(body, done); }; row.appendChild(q); });
    if (left === 0) setTimeout(() => finish(body, done), 300);
  },

  // Ligar todas as chaves
  toggleAll(body, done, p) {
    const n = p.n || 6;
    body.appendChild(el('p', 'mg-instr', 'Suba todas as chaves que estão desligadas (vermelhas).'));
    const row = el('div', 'mg-row'); body.appendChild(row);
    let off = 0;
    for (let i = 0; i < n; i++) { const s = el('div', 'mg-switch'); const on = Math.random() < .35; if (on) s.classList.add('on'); else off++; s.onclick = () => { if (s.classList.contains('on')) return; s.classList.add('on'); off--; SFX.play('tick'); if (off === 0) finish(body, done); }; row.appendChild(s); }
    if (off === 0) setTimeout(() => finish(body, done), 300);
  },

  // Senha no teclado
  keypad(body, done) {
    const code = Array.from({ length: 4 }, () => rnd(10)).join('');
    body.appendChild(el('p', 'mg-instr', 'Tem um bilhete com a senha. Digite no teclado e confirme.'));
    body.appendChild(el('div', 'mg-note', '🗒️ senha: ' + code));
    const disp = el('div', 'mg-code', '_ _ _ _'); body.appendChild(disp);
    const pad = el('div', 'mg-pad'); body.appendChild(pad);
    let typed = '';
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✔'].forEach(k => { const t = el('div', 'mg-tile', String(k)); t.style.height = '52px'; t.onclick = () => { SFX.play('tick'); if (k === 'C') typed = ''; else if (k === '✔') { if (typed === code) { finish(body, done, '✔ Aberto!'); return; } typed = ''; wrong(disp); } else if (typed.length < 4) typed += k; disp.textContent = (typed + '____').slice(0, 4).split('').join(' '); }; pad.appendChild(t); });
  },

  // Ritmo: acertar a zona verde
  rhythm(body, done, p) {
    const need = p.hits || 3;
    body.appendChild(el('p', 'mg-instr', `Toque quando a marca estiver na zona verde. Acerte ${need} vezes.`));
    const meter = el('div', 'mg-meter'); body.appendChild(meter);
    const zone = el('div', 'mg-zone'); meter.appendChild(zone); const mark = el('div', 'mg-mark'); meter.appendChild(mark);
    const btn = el('button', 'mg-hold', '👆 AGORA'); btn.style.marginTop = '14px'; body.appendChild(btn);
    const score = el('div', 'mg-code', '○ '.repeat(need).trim()); body.appendChild(score);
    let x = 0, dir = 1, hits = 0, zl = 40, zw = 20, speed = 1.6;
    const place = () => { zl = 10 + Math.random() * 65; zone.style.left = zl + '%'; zone.style.width = zw + '%'; }; place();
    const t = setInterval(() => { x += dir * speed; if (x >= 98 || x <= 0) dir *= -1; mark.style.left = x + '%'; }, 16);
    btn.onclick = () => { if (x >= zl && x <= zl + zw) { hits++; SFX.play('tick'); score.textContent = ('● '.repeat(hits) + '○ '.repeat(need - hits)).trim(); place(); speed += .5; if (hits === need) { clearInterval(t); finish(body, done); } } else wrong(score); };
    body._cleanup = () => clearInterval(t);
  },

  // Limpar manchas
  clearSpots(body, done, p) {
    const n = p.n || 6;
    body.appendChild(el('p', 'mg-instr', 'Toque em cada ponto para limpar.'));
    const area = el('div', ''); area.style.cssText = 'position:relative;height:220px'; body.appendChild(area);
    let left = n;
    for (let i = 0; i < n; i++) { const d = el('div', 'mg-dirt', p.emoji || ''); d.style.cssText += `position:absolute;left:${5 + Math.random() * 82}%;top:${5 + Math.random() * 68}%;display:flex;align-items:center;justify-content:center;font-size:28px`; d.onclick = () => { d.classList.add('done'); left--; SFX.play('tick'); if (left === 0) finish(body, done); }; area.appendChild(d); }
  },

  // Memória: achar os pares
  memory(body, done, p) {
    const emojis = p.emojis || ['🎃', '👻', '🦇', '🕷️'];
    body.appendChild(el('p', 'mg-instr', 'Vire as cartas e encontre os pares.'));
    const grid = el('div', 'mg-pad'); grid.style.gridTemplateColumns = 'repeat(4,64px)'; body.appendChild(grid);
    let open = [], found = 0, lock = false;
    shuffle([...emojis, ...emojis]).forEach(e => {
      const c = el('div', 'mg-tile', '❓'); c.style.height = '64px'; c.dataset.e = e;
      c.onclick = () => { if (lock || c.classList.contains('done') || open.includes(c)) return; c.textContent = e; open.push(c); SFX.play('tick'); if (open.length === 2) { lock = true; setTimeout(() => { if (open[0].dataset.e === open[1].dataset.e) { open.forEach(x => x.classList.add('done')); found++; if (found === emojis.length) finish(body, done); } else { open.forEach(x => x.textContent = '❓'); SFX.play('bad'); } open = []; lock = false; }, 600); } };
      grid.appendChild(c);
    });
  },

  // Achar o diferente
  oddOne(body, done, p) {
    body.appendChild(el('p', 'mg-instr', 'Um deles é diferente. Toque nele!'));
    const grid = el('div', 'mg-pad'); grid.style.gridTemplateColumns = 'repeat(4,64px)'; body.appendChild(grid);
    const odd = rnd(12);
    for (let i = 0; i < 12; i++) { const c = el('div', 'mg-tile', i === odd ? p.odd : p.emoji); c.style.height = '56px'; c.onclick = () => { if (i === odd) finish(body, done); else wrong(c); }; grid.appendChild(c); }
  },

  // Acerte os que aparecem
  whack(body, done, p) {
    const need = p.hits || 6;
    body.appendChild(el('p', 'mg-instr', `Toque neles quando aparecerem! ${need} vezes.`));
    const grid = el('div', 'mg-pad'); grid.style.gridTemplateColumns = 'repeat(3,70px)'; body.appendChild(grid);
    const holes = Array.from({ length: 9 }, () => { const h = el('div', 'mg-tile', ''); h.style.cssText = 'height:60px;background:#222;color:#fff'; grid.appendChild(h); return h; });
    let hits = 0, cur = -1;
    const score = el('div', 'mg-code', `0/${need}`); body.appendChild(score);
    const pop = () => { if (cur >= 0) holes[cur].textContent = ''; cur = rnd(9); holes[cur].textContent = p.emoji; };
    const t = setInterval(pop, 750); pop();
    holes.forEach((h, i) => h.onclick = () => { if (i === cur && h.textContent) { hits++; h.textContent = '💥'; cur = -1; SFX.play('tick'); score.textContent = `${hits}/${need}`; if (hits >= need) { clearInterval(t); finish(body, done); } } else wrong(h); });
    body._cleanup = () => clearInterval(t);
  },

  // Discos de combinação
  dials(body, done, p) {
    const n = p.n || 3, sym = ['🔴', '🟡', '🟢', '🔵', '🟣'];
    const target = Array.from({ length: n }, () => rnd(sym.length));
    body.appendChild(el('p', 'mg-instr', 'Combinação: ' + target.map(i => sym[i]).join(' ') + ' — toque nos discos até igualar.'));
    const row = el('div', 'mg-row'); body.appendChild(row);
    const cur = Array.from({ length: n }, () => rnd(sym.length));
    const tiles = cur.map((v, i) => { const t = el('div', 'mg-tile', sym[v]); t.onclick = () => { cur[i] = (cur[i] + 1) % sym.length; t.textContent = sym[cur[i]]; SFX.play('tick'); if (cur.every((c, k) => c === target[k])) finish(body, done); }; row.appendChild(t); return t; });
    if (cur.every((c, k) => c === target[k])) cur[0] = (cur[0] + 1) % sym.length, tiles[0].textContent = sym[cur[0]];
  },

  // Contar os objetos
  count(body, done, p) {
    const n = 4 + rnd(6);
    body.appendChild(el('p', 'mg-instr', 'Quantos você vê? Toque no número certo.'));
    const area = el('div', ''); area.style.cssText = 'position:relative;height:150px;font-size:30px'; body.appendChild(area);
    for (let i = 0; i < n; i++) { const e = el('div', '', p.emoji); e.style.cssText = `position:absolute;left:${5 + Math.random() * 85}%;top:${Math.random() * 75}%`; area.appendChild(e); }
    const row = el('div', 'mg-row'); body.appendChild(row);
    const opts = shuffle([n, n + 1, Math.max(1, n - 1)]);
    opts.forEach(v => { const t = el('div', 'mg-tile', String(v)); t.onclick = () => { if (v === n) finish(body, done); else wrong(t); }; row.appendChild(t); });
  },

  // Achar o item escondido (quente/frio)
  findHidden(body, done, p) {
    const key = rnd(9);
    body.appendChild(el('p', 'mg-instr', `Ache ${p.emoji || '🔑'} escondido em uma das gavetas. As gavetas dizem se está quente ou frio!`));
    const grid = el('div', 'mg-pad'); body.appendChild(grid);
    for (let i = 0; i < 9; i++) { const t = el('div', 'mg-tile', '🗄️'); t.style.height = '56px'; t.onclick = () => { if (t.classList.contains('done')) return; if (i === key) { t.textContent = p.emoji || '🔑'; finish(body, done); } else { const d = Math.abs(i % 3 - key % 3) + Math.abs(Math.floor(i / 3) - Math.floor(key / 3)); t.textContent = d <= 1 ? '🔥' : d === 2 ? '🌤️' : '❄️'; t.classList.add('done'); SFX.play('tick'); } }; grid.appendChild(t); }
  },

  // Conta rápida
  math(body, done) {
    const a = 2 + rnd(8), b = 1 + rnd(8), ans = a + b;
    body.appendChild(el('p', 'mg-instr', `Quanto é ${a} + ${b}?`));
    const row = el('div', 'mg-row'); body.appendChild(row);
    shuffle([ans, ans + 1, ans - 1, ans + 2]).forEach(v => { const t = el('div', 'mg-tile', String(v)); t.onclick = () => { if (v === ans) finish(body, done); else wrong(t); }; row.appendChild(t); });
  },

  // Vários sliders nos alvos
  sliders(body, done, p) {
    const n = p.n || 3;
    body.appendChild(el('p', 'mg-instr', 'Coloque cada controle na marca amarela.'));
    const targets = Array.from({ length: n }, () => 10 + rnd(80)), vals = [];
    const t = setInterval(() => { if (vals.every((v, i) => Math.abs(v - targets[i]) < 4)) { clearInterval(t); finish(body, done); } }, 100);
    for (let i = 0; i < n; i++) { const wrap = el('div', ''); wrap.style.cssText = 'position:relative;margin:6px 0'; const mark = el('div', ''); mark.style.cssText = `position:absolute;left:calc(${targets[i]}% - 3px);top:0;width:6px;height:100%;background:#ffd300;border-radius:3px;pointer-events:none`; const s = el('input', 'mg-slider'); s.type = 'range'; s.min = 0; s.max = 100; s.value = rnd(100); vals[i] = +s.value; s.oninput = () => { vals[i] = +s.value; }; wrap.appendChild(s); wrap.appendChild(mark); body.appendChild(wrap); }
    body._cleanup = () => clearInterval(t);
  },

  // Decifrar código com legenda
  cipher(body, done) {
    const sym = ['☾', '✦', '☠', '✝', '♆', '⚝'], legend = shuffle([1, 2, 3, 4, 5, 6]);
    const pick = [rnd(6), rnd(6), rnd(6)], code = pick.map(i => legend[i]).join('');
    body.appendChild(el('p', 'mg-instr', 'Use a legenda para traduzir os símbolos do livro em números.'));
    body.appendChild(el('div', 'mg-note', sym.map((s, i) => s + '=' + legend[i]).join('  ')));
    body.appendChild(el('div', 'mg-code', pick.map(i => sym[i]).join(' ')));
    const disp = el('div', 'mg-code', '_ _ _'); body.appendChild(disp);
    const pad = el('div', 'mg-pad'); body.appendChild(pad);
    let typed = '';
    [1, 2, 3, 4, 5, 6, 'C'].forEach(k => { const t = el('div', 'mg-tile', String(k)); t.style.height = '48px'; t.onclick = () => { SFX.play('tick'); if (k === 'C') typed = ''; else if (typed.length < 3) typed += k; disp.textContent = (typed + '___').slice(0, 3).split('').join(' '); if (typed.length === 3) { if (typed === code) finish(body, done); else { wrong(disp); typed = ''; } } }; pad.appendChild(t); });
  },

  // Regar plantas (3 toques cada)
  grow(body, done, p) {
    const n = p.n || 4, stages = ['🌱', '🌿', '🌷', '🌻'];
    body.appendChild(el('p', 'mg-instr', 'Toque em cada planta até ela florescer.'));
    const row = el('div', 'mg-row'); body.appendChild(row);
    let bloomed = 0;
    for (let i = 0; i < n; i++) { let s = 0; const t = el('div', 'mg-tile', stages[0]); t.onclick = () => { if (s >= 3) return; s++; t.textContent = stages[s]; SFX.play('tick'); if (s === 3) { bloomed++; if (bloomed === n) finish(body, done); } }; row.appendChild(t); }
  },

  // Girar canos até ligar
  pipes(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Toque nos canos para girar até a água passar da esquerda para a direita.'));
    const row = el('div', 'mg-row'); body.appendChild(row);
    const rot = [rnd(4), rnd(4), rnd(4), rnd(4)].map(r => r === 0 ? 1 : r);
    const tiles = rot.map((r, i) => { const t = el('div', 'mg-tile', '━'); t.style.cssText = 'font-size:34px;width:64px'; t.style.transform = `rotate(${r * 90}deg)`; t.onclick = () => { rot[i] = (rot[i] + 1) % 4; t.style.transform = `rotate(${rot[i] * 90}deg)`; SFX.play('tick'); if (rot.every(v => v % 2 === 0)) finish(body, done); }; row.appendChild(t); return t; });
  },

  // Piano: repetir a melodia
  piano(body, done) {
    const keys = ['C', 'D', 'E', 'F', 'G'], seq = Array.from({ length: 4 }, () => rnd(5));
    body.appendChild(el('p', 'mg-instr', 'Ouça a melodia e toque as teclas na mesma ordem.'));
    const row = el('div', 'mg-row'); row.style.marginTop = '20px'; body.appendChild(row);
    const tiles = keys.map((k, i) => { const t = el('div', 'mg-tile', k); t.style.cssText = 'height:90px;width:50px'; row.appendChild(t); return t; });
    const freqs = [262, 294, 330, 349, 392];
    let showing = true, pos = 0;
    const show = (i) => { if (i >= seq.length) { showing = false; return; } const t = tiles[seq[i]]; t.classList.add('sel'); SFX.tone(freqs[seq[i]], .3); setTimeout(() => { t.classList.remove('sel'); setTimeout(() => show(i + 1), 150); }, 400); };
    setTimeout(() => show(0), 400);
    tiles.forEach((t, i) => t.onclick = () => { if (showing) return; SFX.tone(freqs[i], .25); if (seq[pos] === i) { pos++; if (pos === seq.length) finish(body, done); } else { pos = 0; wrong(t); } });
  },

  // Encher até a linha
  fill(body, done, p) {
    const n = p.n || 2;
    body.appendChild(el('p', 'mg-instr', 'Segure para encher e solte quando chegar na linha. Não deixe transbordar!'));
    let doneCount = 0;
    const make = () => {
      const wrap = el('div', ''); wrap.style.cssText = 'position:relative;height:36px;background:#222;border:3px solid #000;border-radius:8px;margin:8px 0;overflow:hidden';
      const target = 60 + rnd(25); const line = el('div', ''); line.style.cssText = `position:absolute;left:${target}%;top:0;bottom:0;width:4px;background:#ffd300`; const liq = el('div', ''); liq.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;background:#8e2de2'; wrap.appendChild(liq); wrap.appendChild(line); body.appendChild(wrap);
      const btn = el('button', 'mg-hold', '🫗 SEGURE PARA ENCHER'); body.appendChild(btn);
      let v = 0, holding = false, over = false;
      const t = setInterval(() => { if (holding && !over) { v += 1.5; liq.style.width = v + '%'; if (v > target + 6) { over = true; liq.style.background = '#c00'; SFX.play('bad'); setTimeout(() => { v = 0; over = false; liq.style.width = '0'; liq.style.background = '#8e2de2'; }, 600); } } }, 40);
      btn.addEventListener('pointerdown', e => { e.preventDefault(); holding = true; });
      const rel = () => { if (!holding) return; holding = false; if (v >= target - 6 && v <= target + 6) { clearInterval(t); btn.disabled = true; btn.textContent = '✔'; doneCount++; SFX.play('tick'); if (doneCount === n) finish(body, done); } };
      btn.addEventListener('pointerup', rel); btn.addEventListener('pointerleave', rel); btn.addEventListener('pointercancel', rel);
    };
    for (let i = 0; i < n; i++) make();
  },
};
