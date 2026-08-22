// ===== BRODS — dados da mansão, personagens e missões =====
// Coordenadas em "unidades de mundo". A mansão inteira tem ~2440 x 1320.

const WORLD = { w: 2440, h: 1320 };

// Cômodos (12). floor = cor do chão, wall = cor da parede.
const ROOMS = [
  { id:'torre',       name:'Torre',              x:80,   y:60,  w:260, h:260, floor:'#4a3d6b', wall:'#2b2140' },
  { id:'sotao',       name:'Sótão',              x:440,  y:60,  w:420, h:260, floor:'#6b4a2e', wall:'#3a2815' },
  { id:'quarto',      name:'Quarto Principal',   x:960,  y:60,  w:420, h:260, floor:'#5a3a6e', wall:'#2e1d3a' },
  { id:'galeria',     name:'Galeria de Quadros', x:1480, y:60,  w:580, h:260, floor:'#7a3b3b', wall:'#3d1c1c' },
  { id:'biblioteca',  name:'Biblioteca',         x:80,   y:460, w:460, h:340, floor:'#7a5230', wall:'#3a2612' },
  { id:'salao',       name:'Salão de Entrada',   x:700,  y:420, w:640, h:420, floor:'#5e2d74', wall:'#2c1438' },
  { id:'jantar',      name:'Sala de Jantar',     x:1480, y:460, w:420, h:340, floor:'#8a4a2a', wall:'#3f2010' },
  { id:'cozinha',     name:'Cozinha',            x:2000, y:460, w:380, h:340, floor:'#3e5a66', wall:'#1d2b31' },
  { id:'porao',       name:'Porão',              x:80,   y:940, w:420, h:300, floor:'#3a3a44', wall:'#17171c' },
  { id:'capela',      name:'Capela',             x:620,  y:960, w:360, h:300, floor:'#5a4a7a', wall:'#2a2240' },
  { id:'jardim',      name:'Jardim',             x:1100, y:940, w:520, h:320, floor:'#2f6b3a', wall:'#173a1d' },
  { id:'laboratorio', name:'Laboratório',        x:1740, y:940, w:440, h:300, floor:'#2f5e5a', wall:'#132a28' },
];
const ROOM_BY_ID = Object.fromEntries(ROOMS.map(r => [r.id, r]));

// Corredores (ligam os cômodos). Também são área andável.
const CORRIDORS = [
  { x:340,  y:150, w:100, h:90 },   // torre ↔ sotao
  { x:860,  y:150, w:100, h:90 },   // sotao ↔ quarto
  { x:1380, y:150, w:100, h:90 },   // quarto ↔ galeria
  { x:180,  y:320, w:90,  h:140 },  // torre ↓ biblioteca
  { x:760,  y:320, w:90,  h:100 },  // sotao ↓ salao
  { x:1100, y:320, w:90,  h:100 },  // quarto ↓ salao
  { x:1600, y:320, w:90,  h:140 },  // galeria ↓ jantar
  { x:540,  y:590, w:160, h:90 },   // biblioteca ↔ salao
  { x:1340, y:590, w:140, h:90 },   // salao ↔ jantar
  { x:1900, y:590, w:100, h:90 },   // jantar ↔ cozinha
  { x:250,  y:800, w:90,  h:140 },  // biblioteca ↓ porao
  { x:760,  y:840, w:90,  h:120 },  // salao ↓ capela
  { x:1200, y:840, w:90,  h:100 },  // salao ↓ jardim
  { x:1800, y:800, w:90,  h:140 },  // jantar ↓ laboratorio
  { x:500,  y:1050, w:120, h:90 },  // porao ↔ capela
  { x:980,  y:1050, w:120, h:90 },  // capela ↔ jardim
  { x:1620, y:1050, w:120, h:90 },  // jardim ↔ laboratorio
];

// Estações (pontos onde as missões acontecem), por cômodo
const STATIONS = {
  torre:       [[210,140],[130,250],[300,230],[300,110]],
  sotao:       [[780,130],[500,120],[650,270],[820,270]],
  quarto:      [[1300,120],[1020,130],[1150,270],[1350,270]],
  galeria:     [[1770,120],[1560,260],[1950,260],[2030,120]],
  biblioteca:  [[300,560],[140,720],[460,720],[120,520]],
  salao:       [[1020,470],[760,780],[1280,780],[1300,480],[740,480]],
  jantar:      [[1690,560],[1520,500],[1860,740],[1520,740]],
  cozinha:     [[2300,540],[2060,500],[2150,760],[2340,760]],
  porao:       [[420,1000],[120,1000],[300,1000],[150,1190]],
  capela:      [[800,1040],[660,1220],[940,1220],[660,1000]],
  jardim:      [[1520,1190],[1180,1000],[1300,1050],[1400,1220],[1180,1190]],
  laboratorio: [[1960,1020],[2100,1000],[1800,1000],[1900,1200]],
};

// Catálogo de MISSÕES (muitas, pra não enjoar). game = motor do minijogo em minigames.js; p = parâmetros.
const TASKS = [
  // Biblioteca
  { id:'bib_livros',   room:'biblioteca', st:0, name:'Ordenar os livros',        icon:'📚', game:'tapOrder',    p:{ n:5, kind:'book' } },
  { id:'bib_poeira',   room:'biblioteca', st:1, name:'Tirar a poeira da poltrona',icon:'🪑', game:'clearSpots',  p:{ n:6, emoji:'🕸️' } },
  { id:'bib_globo',    room:'biblioteca', st:2, name:'Girar o globo até o X',    icon:'🌍', game:'alignSlider', p:{ emoji:'❌', label:'Gire o globo até o X ficar na mira' } },
  { id:'bib_codigo',   room:'biblioteca', st:3, name:'Decifrar o código do livro',icon:'🔤', game:'cipher',      p:{} },
  { id:'bib_pares',    room:'biblioteca', st:1, name:'Achar os pares de capas',  icon:'🃏', game:'memory',      p:{ emojis:['📕','📗','📘','📙'] } },
  // Jardim
  { id:'jar_fios',     room:'jardim',     st:0, name:'Ligar os fios do portão',  icon:'🔌', game:'wires',       p:{} },
  { id:'jar_regar',    room:'jardim',     st:1, name:'Regar as plantas',         icon:'🌱', game:'grow',        p:{ n:4 } },
  { id:'jar_morcegos', room:'jardim',     st:2, name:'Contar os morcegos',       icon:'🦇', game:'count',       p:{ emoji:'🦇' } },
  { id:'jar_fonte',    room:'jardim',     st:3, name:'Consertar a fonte',        icon:'⛲', game:'pipes',       p:{} },
  { id:'jar_aboboras', room:'jardim',     st:4, name:'Espantar os corvos',       icon:'🐦‍⬛', game:'whack',     p:{ emoji:'🐦‍⬛', hits:6 } },
  // Laboratório
  { id:'lab_pocao',    room:'laboratorio',st:0, name:'Misturar a poção',         icon:'⚗️', game:'pocao',       p:{} },
  { id:'lab_tanque',   room:'laboratorio',st:1, name:'Calibrar o tanque',        icon:'🧪', game:'sliders',     p:{ n:3 } },
  { id:'lab_formula',  room:'laboratorio',st:3, name:'Resolver a fórmula',       icon:'🧮', game:'math',        p:{} },
  { id:'lab_frascos',  room:'laboratorio',st:2, name:'Separar os frascos',       icon:'🧫', game:'oddOne',      p:{ emoji:'🧪', odd:'🧫' } },
  { id:'lab_cadeado',  room:'laboratorio',st:2, name:'Abrir o cadeado de cores', icon:'🔐', game:'dials',       p:{ n:3 } },
  // Torre
  { id:'tor_telesc',   room:'torre',      st:0, name:'Girar o telescópio',       icon:'🔭', game:'alignSlider', p:{ emoji:'🌕', label:'Gire o telescópio até a lua ficar na mira' } },
  { id:'tor_mapas',    room:'torre',      st:1, name:'Ligar as estrelas',        icon:'⭐', game:'tapOrder',    p:{ n:6, kind:'star' } },
  { id:'tor_corujas',  room:'torre',      st:2, name:'Contar as corujas',        icon:'🦉', game:'count',       p:{ emoji:'🦉' } },
  { id:'tor_sino',     room:'torre',      st:3, name:'Afinar o sino da torre',   icon:'🔔', game:'piano',       p:{} },
  // Capela
  { id:'cap_velas',    room:'capela',     st:0, name:'Acender as velas',         icon:'🕯️', game:'simon',       p:{ kind:'candle', n:4 } },
  { id:'cap_orgao',    room:'capela',     st:3, name:'Tocar o órgão',            icon:'🎹', game:'piano',       p:{} },
  { id:'cap_bancos',   room:'capela',     st:1, name:'Limpar os bancos',         icon:'🧽', game:'clearSpots',  p:{ n:7, emoji:'💩' } },
  { id:'cap_sino',     room:'capela',     st:2, name:'Tocar o sino no ritmo',    icon:'🔔', game:'rhythm',      p:{ hits:3 } },
  // Sala de Jantar
  { id:'jan_mesa',     room:'jantar',     st:0, name:'Arrumar a mesa',           icon:'🍽️', game:'slots',       p:{ items:[['🍽️','Prato'],['🍴','Talher'],['🥛','Copo'],['🕯️','Vela']] } },
  { id:'jan_lareira',  room:'jantar',     st:1, name:'Acender a lareira',        icon:'🔥', game:'hold',        p:{ emoji:'🔥', label:'SEGURE PARA SOPRAR O FOGO' } },
  { id:'jan_tacas',    room:'jantar',     st:2, name:'Encher as taças',          icon:'🍷', game:'fill',        p:{ n:2 } },
  { id:'jan_retrato',  room:'jantar',     st:3, name:'Achar o retrato certo',    icon:'🖼️', game:'oddOne',      p:{ emoji:'👤', odd:'🧛' } },
  // Quarto
  { id:'qua_janela',   room:'quarto',     st:0, name:'Fechar a janela',          icon:'🪟', game:'hold',        p:{ emoji:'🪟', label:'SEGURE PARA FECHAR' } },
  { id:'qua_cama',     room:'quarto',     st:1, name:'Arrumar a cama',           icon:'🛏️', game:'slots',       p:{ items:[['🛏️','Lençol'],['🪶','Travesseiro'],['🧸','Ursinho'],['🧦','Meia']] } },
  { id:'qua_espelho',  room:'quarto',     st:2, name:'Limpar o espelho',         icon:'🪞', game:'clearSpots',  p:{ n:6, emoji:'💨' } },
  { id:'qua_bau',      room:'quarto',     st:3, name:'Achar a chave no baú',     icon:'🔑', game:'findHidden',  p:{ emoji:'🔑' } },
  // Galeria
  { id:'gal_quadros',  room:'galeria',    st:0, name:'Endireitar os quadros',    icon:'🖼️', game:'quadros',     p:{} },
  { id:'gal_estatua',  room:'galeria',    st:1, name:'Montar a estátua',         icon:'🗿', game:'slots',       p:{ items:[['🗿','Cabeça'],['💪','Braço'],['🦵','Perna'],['🛡️','Escudo']] } },
  { id:'gal_olhos',    room:'galeria',    st:2, name:'Achar o quadro que pisca', icon:'👁️', game:'oddOne',      p:{ emoji:'👁️', odd:'😉' } },
  { id:'gal_pares',    room:'galeria',    st:3, name:'Parear os retratos',       icon:'🃏', game:'memory',      p:{ emojis:['🧛','🧟','👻','🧙'] } },
  // Porão
  { id:'por_forca',    room:'porao',      st:0, name:'Religar a caixa de força', icon:'⚡', game:'toggleAll',   p:{ n:6 } },
  { id:'por_ratos',    room:'porao',      st:1, name:'Espantar os ratos',        icon:'🐀', game:'whack',       p:{ emoji:'🐀', hits:7 } },
  { id:'por_caldeira', room:'porao',      st:2, name:'Ajustar a caldeira',       icon:'🌡️', game:'sliders',     p:{ n:2 } },
  { id:'por_barris',   room:'porao',      st:3, name:'Empilhar os barris',       icon:'🛢️', game:'tapOrder',    p:{ n:5, kind:'barrel' } },
  // Sótão
  { id:'sot_bau',      room:'sotao',      st:0, name:'Abrir o baú com a senha',  icon:'🧰', game:'keypad',      p:{} },
  { id:'sot_caixas',   room:'sotao',      st:1, name:'Organizar as caixas',      icon:'📦', game:'tapOrder',    p:{ n:4, kind:'box' } },
  { id:'sot_teias',    room:'sotao',      st:2, name:'Tirar as teias',           icon:'🕸️', game:'clearSpots',  p:{ n:8, emoji:'🕸️' } },
  { id:'sot_morcegos', room:'sotao',      st:3, name:'Acordar os morcegos',      icon:'🦇', game:'whack',       p:{ emoji:'🦇', hits:5 } },
  // Cozinha
  { id:'coz_caldeirao',room:'cozinha',    st:0, name:'Mexer o caldeirão',        icon:'🍲', game:'rhythm',      p:{ hits:3 } },
  { id:'coz_receita',  room:'cozinha',    st:1, name:'Seguir a receita',         icon:'📜', game:'simon',       p:{ kind:'tile', n:4, emojis:['🧄','🍄','🦴','🐸'] } },
  { id:'coz_louca',    room:'cozinha',    st:2, name:'Lavar a louça',            icon:'🧼', game:'clearSpots',  p:{ n:6, emoji:'🍽️' } },
  { id:'coz_ingred',   room:'cozinha',    st:3, name:'Contar os ingredientes',   icon:'🧄', game:'math',        p:{} },
  // Salão
  { id:'sal_escada',   room:'salao',      st:0, name:'Limpar a escada',          icon:'🧹', game:'clearSpots',  p:{ n:6, emoji:'🟤' } },
  { id:'sal_armadura', room:'salao',      st:1, name:'Polir a armadura',         icon:'🛡️', game:'hold',        p:{ emoji:'🛡️', label:'SEGURE PARA POLIR' } },
  { id:'sal_porta',    room:'salao',      st:2, name:'Trancar a porta',          icon:'🚪', game:'dials',       p:{ n:3 } },
  { id:'sal_lustre',   room:'salao',      st:3, name:'Acender o lustre',         icon:'💡', game:'toggleAll',   p:{ n:5 } },
  { id:'sal_tapete',   room:'salao',      st:4, name:'Desamassar o tapete',      icon:'🟥', game:'clearSpots',  p:{ n:5, emoji:'〰️' } },
];
const TASK_BY_ID = Object.fromEntries(TASKS.map(t => [t.id, t]));
function taskPos(t) { const s = STATIONS[t.room][t.st]; return { x: s[0], y: s[1] }; }

// Botão de emergência (Salão)
const EMERGENCY = { x: 1020, y: 690 };

// Passagens secretas (só DEMOM e CHEFE)
const SECRET = [
  { a:'biblioteca', b:'porao',  ax:500, ay:760, bx:460, by:1200 },
  { a:'cozinha',    b:'sotao',  ax:2040, ay:760, bx:480, by:290 },
];

// Cores dos VENUS (o amarelo é o original; os outros recolorem o sprite)
const VENUS_COLORS = [
  { name:'Amarelo', css:'#ffd300' },
  { name:'Azul',    css:'#2f7cf6', hue:215 },
  { name:'Verde',   css:'#2ecc40', hue:125 },
  { name:'Rosa',    css:'#ff5fb4', hue:325 },
  { name:'Laranja', css:'#ff8c1a', hue:24, light:.95 },
  { name:'Roxo',    css:'#9b4dff', hue:270 },
  { name:'Ciano',   css:'#22d3ee', hue:188 },
  { name:'Lima',    css:'#b5e61d', hue:80 },
  { name:'Branco',  css:'#f4f4f4', hue:50, sat:.06, light:1.7 },
  { name:'Preto',   css:'#444',    hue:50, sat:.25, light:.3 },
  { name:'Marrom',  css:'#a0522d', hue:22, sat:.7, light:.6 },
  { name:'Vinho',   css:'#b0224a', hue:345, light:.7 },
  { name:'Céu',     css:'#8ec5ff', hue:205, sat:.9, light:1.35 },
  { name:'Salmão',  css:'#ff8a80', hue:8, light:1.2 },
  { name:'Turquesa',css:'#1abc9c', hue:170 },
  { name:'Magenta', css:'#e040fb', hue:300 },
  { name:'Índigo',  css:'#5c6bc0', hue:240, light:.85 },
];

// Decorações simples por cômodo (desenhadas em canvas enquanto não há arte). type define o desenho.
const DECOR = [
  { type:'window',   x:140, y:80,  w:60, h:40 },
  { type:'telescope',x:200, y:120 },
  { type:'chest',    x:760, y:110 },
  { type:'boxes',    x:480, y:90 },
  { type:'web',      x:840, y:70 },
  { type:'bed',      x:990, y:100 },
  { type:'window',   x:1280, y:80, w:70, h:50 },
  { type:'rug',      x:1150, y:200, w:160, h:70 },
  { type:'painting', x:1520, y:85, c:'#b33' },
  { type:'painting', x:1640, y:85, c:'#36b' },
  { type:'painting', x:1760, y:85, c:'#3a3' },
  { type:'painting', x:1880, y:85, c:'#a6a' },
  { type:'painting', x:1990, y:85, c:'#da3' },
  { type:'shelf',    x:100, y:480, w:200 },
  { type:'shelf',    x:330, y:480, w:190 },
  { type:'table',    x:280, y:650 },
  { type:'stairs',   x:960, y:440 },
  { type:'carpet',   x:900, y:600, w:240, h:200 },
  { type:'button',   x:1020, y:690 },
  { type:'candel',   x:730, y:450 },
  { type:'candel',   x:1300, y:450 },
  { type:'dtable',   x:1580, y:560 },
  { type:'candel',   x:1500, y:480 },
  { type:'stove',    x:2030, y:480 },
  { type:'cauldron', x:2290, y:540 },
  { type:'knives',   x:2150, y:480 },
  { type:'powerbox', x:420, y:960 },
  { type:'barrel',   x:120, y:980 },
  { type:'barrel',   x:170, y:1010 },
  { type:'cage',     x:260, y:1120 },
  { type:'altar',    x:800, y:990 },
  { type:'bench',    x:680, y:1130 }, { type:'bench',    x:860, y:1130 },
  { type:'bench',    x:680, y:1190 }, { type:'bench',    x:860, y:1190 },
  { type:'bush',     x:1140, y:980 }, { type:'bush', x:1560, y:980 },
  { type:'tomb',     x:1250, y:1000 }, { type:'tomb', x:1330, y:1030 },
  { type:'gate',     x:1500, y:1180 },
  { type:'tree',     x:1170, y:1180 },
  { type:'bench2',   x:1780, y:980, w:160 },
  { type:'flasks',   x:1960, y:990 },
  { type:'tank',     x:2100, y:1000 },
];

// Ajustes da partida (painel de opções vem na fatia 4; por ora valores padrão)
const SETTINGS = {
  players: 8,
  tasksPerVenus: 5,
  killCooldown: 25,
  swallowCooldown: 30,
  digestTime: 60,
  discussionTime: 25,
  voteTime: 25,
  botSpeed: 165,
  playerSpeed: 190,
  emergencyPerPlayer: 1,
  sabCooldown: 30,
  botTrust: .6,        // chance de um VENUS do computador acreditar numa acusação do jogador
  revealRole: true,
};
