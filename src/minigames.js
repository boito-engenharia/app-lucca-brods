// ===== BRODS — minijogos das missões =====
// Cada minijogo: function(body, done) — desenha dentro de `body` e chama done() ao terminar.

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function finish(body, done, msg) {
  body.appendChild(el('div', 'mg-ok', msg || '✔ Missão concluída!'));
  SFX.play('ok');
  setTimeout(done, 650);
}

const MINIGAMES = {

  // 📚 Biblioteca — toque nos livros em ordem 1..5
  livros(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Toque nos livros na ordem certa: 1, 2, 3, 4, 5.'));
    const row = el('div', 'mg-row'); body.appendChild(row);
    const colors = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400'];
    let next = 1;
    shuffle([1, 2, 3, 4, 5]).forEach(n => {
      const b = el('div', 'mg-tile mg-book', String(n));
      b.style.background = colors[n - 1];
      b.onclick = () => {
        if (n === next) { b.classList.add('done'); next++; SFX.play('tick'); if (next > 5) finish(body, done); }
        else { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 300); SFX.play('bad'); }
      };
      row.appendChild(b);
    });
  },

  // 🔌 Jardim — ligar fios por cor (esquerda → direita)
  fios(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Ligue cada fio à cor igual: toque em um da esquerda e depois no da direita.'));
    const wrap = el('div', 'mg-wire'); body.appendChild(wrap);
    const L = el('div', 'col'), R = el('div', 'col'); wrap.appendChild(L); wrap.appendChild(R);
    const colors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'];
    let sel = null, doneCount = 0;
    shuffle(colors).forEach(c => { const d = el('div', 'mg-dot'); d.style.background = c; d.dataset.c = c; d.onclick = () => { L.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); d.classList.add('sel'); sel = d; SFX.play('tick'); }; L.appendChild(d); });
    shuffle(colors).forEach(c => {
      const d = el('div', 'mg-dot'); d.style.background = c; d.onclick = () => {
        if (!sel) return;
        if (sel.dataset.c === c) { sel.classList.add('done'); d.classList.add('done'); sel.classList.remove('sel'); sel = null; doneCount++; SFX.play('tick'); if (doneCount === 4) finish(body, done); }
        else { d.classList.add('wrong'); setTimeout(() => d.classList.remove('wrong'), 300); SFX.play('bad'); }
      }; R.appendChild(d);
    });
  },

  // ⚗️ Laboratório — repita a sequência de cores da poção
  pocao(body, done) {
    const seqColors = [['#e74c3c', '🔴'], ['#3498db', '🔵'], ['#2ecc71', '🟢'], ['#f1c40f', '🟡']];
    const target = Array.from({ length: 3 }, () => Math.floor(Math.random() * 4));
    body.appendChild(el('p', 'mg-instr', 'A receita da poção é: ' + target.map(i => seqColors[i][1]).join(' → ') + '. Toque nos frascos nessa ordem.'));
    const row = el('div', 'mg-row'); body.appendChild(row);
    let pos = 0;
    seqColors.forEach(([c, emo], i) => {
      const t = el('div', 'mg-tile', emo); t.style.background = c;
      t.onclick = () => {
        if (target[pos] === i) { pos++; SFX.play('tick'); t.classList.add('sel'); setTimeout(() => t.classList.remove('sel'), 200); if (pos === 3) finish(body, done, '✔ Poção pronta!'); }
        else { pos = 0; t.classList.add('wrong'); setTimeout(() => t.classList.remove('wrong'), 300); SFX.play('bad'); }
      };
      row.appendChild(t);
    });
  },

  // 🔭 Torre — alinhar o telescópio com a lua (slider)
  telescopio(body, done) {
    const target = 15 + Math.floor(Math.random() * 70);
    body.appendChild(el('p', 'mg-instr', 'Gire o telescópio até a lua ficar no meio da mira e segure por um instante.'));
    const view = el('div', 'mg-meter'); view.style.height = '70px'; body.appendChild(view);
    const moon = el('div', '', '🌕'); moon.style.cssText = `position:absolute;top:12px;font-size:36px;left:${target}%;transform:translateX(-50%)`; view.appendChild(moon);
    const cross = el('div', ''); cross.style.cssText = 'position:absolute;top:0;bottom:0;left:50%;width:4px;margin-left:-2px;background:#ffd300'; view.appendChild(cross);
    const s = el('input', 'mg-slider'); s.type = 'range'; s.min = 0; s.max = 100; s.value = 50; body.appendChild(s);
    let hold = 0, t;
    const tick = () => {
      const v = +s.value; // moon position relative to cross: move the moon opposite to slider
      const pos = 50 + (target - v);
      moon.style.left = pos + '%';
      if (Math.abs(pos - 50) < 3) { hold++; if (hold > 25) { clearInterval(t); finish(body, done, '✔ Lua encontrada!'); } }
      else hold = 0;
    };
    t = setInterval(tick, 40);
  },

  // 🕯️ Capela — sequência de velas (genius)
  velas(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Veja as velas piscarem e acenda na mesma ordem.'));
    const row = el('div', 'mg-row'); row.style.marginTop = '30px'; body.appendChild(row);
    const seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
    const candles = [0, 1, 2, 3].map(() => { const c = el('div', 'mg-candle'); row.appendChild(c); return c; });
    let showing = true, pos = 0;
    const show = (i) => { if (i >= seq.length) { showing = false; return; } const c = candles[seq[i]]; c.classList.add('flash', 'lit'); SFX.play('tick'); setTimeout(() => { c.classList.remove('flash', 'lit'); setTimeout(() => show(i + 1), 250); }, 500); };
    setTimeout(() => show(0), 500);
    candles.forEach((c, i) => c.onclick = () => {
      if (showing) return;
      if (seq[pos] === i) { c.classList.add('lit'); pos++; SFX.play('tick'); if (pos === seq.length) finish(body, done, '✔ Velas acesas!'); }
      else { candles.forEach(x => x.classList.remove('lit')); pos = 0; c.classList.add('wrong'); setTimeout(() => c.classList.remove('wrong'), 300); SFX.play('bad'); }
    });
  },

  // 🍽️ Jantar — colocar cada item no lugar certo
  mesa(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Toque em um item e depois no lugar dele na mesa.'));
    const items = [['🍽️', 'Prato'], ['🍴', 'Talher'], ['🥛', 'Copo'], ['🕯️', 'Vela']];
    const slots = el('div', 'mg-row'); body.appendChild(slots);
    const bag = el('div', 'mg-row'); bag.style.marginTop = '16px'; body.appendChild(bag);
    let sel = null, n = 0;
    items.forEach(([emo, name]) => { const s = el('div', 'mg-slot', `<small style="font-size:12px">${name}</small>`); s.dataset.n = name; s.onclick = () => { if (sel && sel.dataset.n === name) { s.innerHTML = emo; s.classList.add('filled'); sel.remove(); sel = null; n++; SFX.play('tick'); if (n === 4) finish(body, done, '✔ Mesa arrumada!'); } else if (sel) { s.classList.add('wrong'); setTimeout(() => s.classList.remove('wrong'), 300); SFX.play('bad'); } }; slots.appendChild(s); });
    shuffle(items).forEach(([emo, name]) => { const t = el('div', 'mg-tile', emo); t.dataset.n = name; t.onclick = () => { bag.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); t.classList.add('sel'); sel = t; SFX.play('tick'); }; bag.appendChild(t); });
  },

  // 🪟 Quarto — segurar o botão pra fechar a janela contra o vento
  janela(body, done) {
    body.appendChild(el('p', 'mg-instr', 'O vento está forte! Segure o botão até fechar a janela.'));
    const btn = el('button', 'mg-hold', '🪟 SEGURE PARA FECHAR'); body.appendChild(btn);
    const bar = el('div', 'mg-progress'); const fill = el('div'); bar.appendChild(fill); body.appendChild(bar);
    let p = 0, holding = false, t;
    const start = (e) => { e.preventDefault(); holding = true; };
    const stop = () => { holding = false; };
    btn.addEventListener('pointerdown', start); btn.addEventListener('pointerup', stop); btn.addEventListener('pointerleave', stop); btn.addEventListener('pointercancel', stop);
    t = setInterval(() => { p += holding ? 2.2 : -1.2; p = Math.max(0, Math.min(100, p)); fill.style.width = p + '%'; if (holding && Math.random() < .2) SFX.play('tick'); if (p >= 100) { clearInterval(t); finish(body, done, '✔ Janela fechada!'); } }, 50);
  },

  // 🖼️ Galeria — endireitar quadros tortos
  quadros(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Toque nos quadros tortos até ficarem retos.'));
    const row = el('div', 'mg-row'); row.style.marginTop = '10px'; body.appendChild(row);
    let left = 0;
    ['#b33', '#36b', '#3a3', '#a6a', '#da3'].forEach(c => {
      const tilt = Math.random() < .75 ? (Math.random() < .5 ? -1 : 1) * (12 + Math.floor(Math.random() * 15)) : 0;
      if (tilt) left++;
      const p = el('div', 'mg-paint'); p.style.background = c; p.style.transform = `rotate(${tilt}deg)`; p.dataset.t = tilt;
      p.onclick = () => { if (+p.dataset.t === 0) return; p.dataset.t = 0; p.style.transform = 'rotate(0deg)'; left--; SFX.play('tick'); if (left === 0) finish(body, done, '✔ Tudo alinhado!'); };
      row.appendChild(p);
    });
    if (left === 0) { setTimeout(() => finish(body, done), 300); }
  },

  // ⚡ Porão — ligar todas as chaves da caixa de força
  forca(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Suba todas as chaves que estão desligadas (vermelhas).'));
    const row = el('div', 'mg-row'); body.appendChild(row);
    let off = 0;
    for (let i = 0; i < 6; i++) {
      const s = el('div', 'mg-switch'); const on = Math.random() < .4; if (on) s.classList.add('on'); else off++;
      s.onclick = () => { if (s.classList.contains('on')) return; s.classList.add('on'); off--; SFX.play('tick'); if (off === 0) finish(body, done, '✔ Energia restaurada!'); };
      row.appendChild(s);
    }
    if (off === 0) setTimeout(() => finish(body, done), 300);
  },

  // 🧰 Sótão — digitar a senha do baú
  bau(body, done) {
    const code = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
    body.appendChild(el('p', 'mg-instr', 'Tem um bilhete grudado no baú com a senha. Digite no teclado.'));
    body.appendChild(el('div', 'mg-note', '🗒️ senha: ' + code));
    const disp = el('div', 'mg-code', '_ _ _ _'); body.appendChild(disp);
    const pad = el('div', 'mg-pad'); body.appendChild(pad);
    let typed = '';
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✔'].forEach(k => {
      const t = el('div', 'mg-tile', String(k)); t.style.height = '52px';
      t.onclick = () => {
        SFX.play('tick');
        if (k === 'C') typed = '';
        else if (k === '✔') { if (typed === code) { finish(body, done, '✔ Baú aberto!'); return; } typed = ''; disp.classList.add('wrong'); setTimeout(() => disp.classList.remove('wrong'), 300); SFX.play('bad'); }
        else if (typed.length < 4) typed += k;
        disp.textContent = (typed + '____').slice(0, 4).split('').join(' ').replace(/_/g, '_');
      };
      pad.appendChild(t);
    });
  },

  // 🍲 Cozinha — mexer o caldeirão no ritmo (acertar a zona verde 3x)
  caldeirao(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Toque em MEXER quando a marca estiver na zona verde. Acerte 3 vezes.'));
    const meter = el('div', 'mg-meter'); body.appendChild(meter);
    const zone = el('div', 'mg-zone'); meter.appendChild(zone);
    const mark = el('div', 'mg-mark'); meter.appendChild(mark);
    const btn = el('button', 'mg-hold', '🥄 MEXER'); btn.style.marginTop = '14px'; body.appendChild(btn);
    const score = el('div', 'mg-code', '○ ○ ○'); body.appendChild(score);
    let x = 0, dir = 1, hits = 0, zl = 40, zw = 20, speed = 1.6, t;
    const place = () => { zl = 10 + Math.random() * 65; zone.style.left = zl + '%'; zone.style.width = zw + '%'; };
    place();
    t = setInterval(() => { x += dir * speed; if (x >= 98 || x <= 0) dir *= -1; mark.style.left = x + '%'; }, 16);
    btn.onclick = () => {
      if (x >= zl && x <= zl + zw) { hits++; SFX.play('tick'); score.textContent = '●'.repeat(hits) + ' ○'.repeat(3 - hits); place(); speed += .5; if (hits === 3) { clearInterval(t); finish(body, done, '✔ Caldeirão mexido!'); } }
      else { score.classList.add('wrong'); setTimeout(() => score.classList.remove('wrong'), 300); SFX.play('bad'); }
    };
  },

  // 🧹 Salão — limpar as manchas da escada
  escada(body, done) {
    body.appendChild(el('p', 'mg-instr', 'Toque em cada mancha de sujeira para limpar a escada.'));
    const area = el('div', ''); area.style.cssText = 'position:relative;height:220px'; body.appendChild(area);
    let left = 6;
    for (let i = 0; i < 6; i++) {
      const d = el('div', 'mg-dirt'); d.style.cssText += `position:absolute;left:${8 + Math.random() * 78}%;top:${5 + Math.random() * 70}%`;
      d.onclick = () => { d.classList.add('done'); left--; SFX.play('tick'); if (left === 0) finish(body, done, '✔ Escada limpa!'); };
      area.appendChild(d);
    }
  },
};
