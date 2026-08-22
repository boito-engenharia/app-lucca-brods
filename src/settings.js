// ===== BRODS — painel de ajustes e medalhas =====
'use strict';

const SETTING_DEFS = [
  { k: 'tasksPerVenus',  label: 'Missões por VENUS',            min: 3,   max: 8,   step: 1,  fmt: v => v },
  { k: 'playerSpeed',    label: 'Sua velocidade',                min: 140, max: 260, step: 10, fmt: v => v },
  { k: 'botSpeed',       label: 'Velocidade dos outros',         min: 120, max: 240, step: 10, fmt: v => v },
  { k: 'killCooldown',   label: 'Recarga do MATAR (s)',          min: 10,  max: 45,  step: 5,  fmt: v => v + 's' },
  { k: 'swallowCooldown',label: 'Recarga do ENGOLIR (s)',        min: 10,  max: 45,  step: 5,  fmt: v => v + 's' },
  { k: 'digestTime',     label: 'Tempo de digestão (s)',         min: 30,  max: 120, step: 10, fmt: v => v + 's' },
  { k: 'discussionTime', label: 'Tempo de discussão (s)',        min: 10,  max: 45,  step: 5,  fmt: v => v + 's' },
  { k: 'voteTime',       label: 'Tempo de votação (s)',          min: 10,  max: 45,  step: 5,  fmt: v => v + 's' },
  { k: 'sabCooldown',    label: 'Recarga das sabotagens (s)',    min: 15,  max: 60,  step: 5,  fmt: v => v + 's' },
  { k: 'botTrust',       label: 'Os VENUS acreditam em você',    min: 0,   max: 1,   step: .1, fmt: v => Math.round(v * 100) + '%' },
  { k: 'demomCount',     label: 'Número de DEMOM (só com 10+)',  min: 1,   max: 2,   step: 1,  fmt: v => v },
  { k: 'footprints',     label: 'DEMOM deixa pegadas',           bool: true },
  { k: 'revealRole',     label: 'Revelar papel do expulso',      bool: true },
];
const SETTING_DEFAULTS = Object.assign({}, SETTINGS, { demomCount: 1, footprints: false });

function loadSettings() {
  try { const s = JSON.parse(localStorage.getItem('brods_settings') || '{}'); for (const d of SETTING_DEFS) if (s[d.k] !== undefined) SETTINGS[d.k] = s[d.k]; } catch (e) { }
  if (SETTINGS.demomCount === undefined) SETTINGS.demomCount = 1; if (SETTINGS.footprints === undefined) SETTINGS.footprints = false;
}
function saveSettings() { const o = {}; for (const d of SETTING_DEFS) o[d.k] = SETTINGS[d.k]; localStorage.setItem('brods_settings', JSON.stringify(o)); }
function openSettings() {
  const body = $('set-body'); body.innerHTML = '';
  for (const d of SETTING_DEFS) {
    const row = el('div', 'set-row');
    const lab = el('label', '', d.label); row.appendChild(lab);
    if (d.bool) { const b = el('button', 'small-btn tog' + (SETTINGS[d.k] ? ' on' : ''), SETTINGS[d.k] ? 'LIGADO' : 'DESLIGADO'); b.onclick = () => { SETTINGS[d.k] = !SETTINGS[d.k]; b.textContent = SETTINGS[d.k] ? 'LIGADO' : 'DESLIGADO'; b.classList.toggle('on', SETTINGS[d.k]); saveSettings(); SFX.play('tick'); }; row.appendChild(b); }
    else { const wrap = el('div', 'set-ctl'); const val = el('b', '', d.fmt(SETTINGS[d.k])); const inp = el('input'); inp.type = 'range'; inp.min = d.min; inp.max = d.max; inp.step = d.step; inp.value = SETTINGS[d.k]; inp.oninput = () => { SETTINGS[d.k] = +inp.value; val.textContent = d.fmt(SETTINGS[d.k]); saveSettings(); }; wrap.appendChild(inp); wrap.appendChild(val); row.appendChild(wrap); }
    body.appendChild(row);
  }
  const reset = el('button', 'big-btn secondary', 'Voltar ao padrão'); reset.onclick = () => { for (const d of SETTING_DEFS) SETTINGS[d.k] = SETTING_DEFAULTS[d.k]; saveSettings(); openSettings(); }; body.appendChild(reset);
  $('settings').classList.remove('hidden');
}

// ---------- Medalhas ----------
const MEDALS = [
  { id: 'first_win',  icon: '🏆', name: 'Primeira Vitória',        desc: 'Vença uma partida.' },
  { id: 'detective',  icon: '🕵️', name: 'Detetive de Primeira',    desc: 'Como VENUS, vote certo logo na primeira expulsão.' },
  { id: 'tasks',      icon: '🔧', name: 'Mestre das Missões',      desc: 'Complete todas as suas missões numa partida.' },
  { id: 'survivor',   icon: '🛡️', name: 'Sobrevivente',            desc: 'Vença como VENUS sendo um dos 2 últimos vivos.' },
  { id: 'liar',       icon: '🎭', name: 'Mentiroso Profissional',  desc: 'Vença como DEMOM sem receber nenhum voto.' },
  { id: 'lights',     icon: '💡', name: 'Senhor das Trevas',       desc: 'Vença como DEMOM depois de apagar as luzes.' },
  { id: 'belly',      icon: '🍽️', name: 'Barriga Cheia',           desc: 'Como CHEFE, engula 5 numa partida.' },
  { id: 'chefe_win',  icon: '👨‍🍳', name: 'Último em Pé',            desc: 'Vença como CHEFE.' },
  { id: 'reader',     icon: '📖', name: 'Leitor dos Mortos',       desc: 'Use o Livro dos Mortos 3 vezes (somando partidas).' },
  { id: 'shield',     icon: '🧪', name: 'Escudo na Hora Certa',    desc: 'A Poção de Escudo salva você de um ataque.' },
  { id: 'fugitive',   icon: '🕳️', name: 'Fugitivo',                desc: 'Use passagens secretas 3 vezes numa partida.' },
  { id: 'reviver',    icon: '✨', name: 'Segunda Chance',          desc: 'Traga alguém de volta no Altar.' },
];
const MED = { have: new Set(), counters: { reads: 0 } };
function loadMedals() { try { const s = JSON.parse(localStorage.getItem('brods_medals') || '{}'); (s.have || []).forEach(x => MED.have.add(x)); Object.assign(MED.counters, s.counters || {}); } catch (e) { } }
function saveMedals() { localStorage.setItem('brods_medals', JSON.stringify({ have: [...MED.have], counters: MED.counters })); }
function unlockMedal(id) {
  if (MED.have.has(id)) return; const m = MEDALS.find(x => x.id === id); if (!m) return;
  MED.have.add(id); saveMedals(); SFX.play('win');
  setTimeout(() => toast(`🏅 MEDALHA: ${m.icon} ${m.name}!`), 600);
}
function checkMedalsEnd(winner) {
  const me = G.player; const iWon = me.kind === winner;
  if (iWon) unlockMedal('first_win');
  if (me.kind === 'venus' && me.tasks.length && me.tasks.every(t => t.done)) unlockMedal('tasks');
  if (iWon && me.kind === 'venus' && me.alive && countAlive('venus') <= 2) unlockMedal('survivor');
  if (iWon && me.kind === 'demom' && !G.votesAgainstMe) unlockMedal('liar');
  if (iWon && me.kind === 'demom' && G.usedLights) unlockMedal('lights');
  if (iWon && me.kind === 'chefe') unlockMedal('chefe_win');
  if (me.kind === 'chefe' && (G.swallowCount || 0) >= 5) unlockMedal('belly');
  if (me.kind === 'venus' && G.firstEjectRole && G.firstEjectRole !== 'venus' && G.myFirstVoteHit) unlockMedal('detective');
  if ((G.secretUses || 0) >= 3) unlockMedal('fugitive');
}
function openMedals() {
  const body = $('med-body'); body.innerHTML = '';
  for (const m of MEDALS) { const has = MED.have.has(m.id); const row = el('div', 'med' + (has ? ' has' : '')); row.appendChild(el('span', 'med-ico', has ? m.icon : '🔒')); const t = el('div', 'med-txt'); t.appendChild(el('b', '', m.name)); t.appendChild(el('small', '', m.desc)); row.appendChild(t); body.appendChild(row); }
  $('med-count').textContent = `${MED.have.size}/${MEDALS.length}`;
  $('medals').classList.remove('hidden');
}
