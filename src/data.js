// ===== BRODS — dados da mansão =====
// Coordenadas em "unidades de mundo". A mansão inteira tem ~2400 x 1320.

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

// Missões: uma por cômodo. pos = onde fica a estação, icon = desenho na planta.
const MISSIONS = [
  { id:'livros',     room:'biblioteca',  name:'Ordenar os livros',          icon:'📚', x:300,  y:560 },
  { id:'fios',       room:'jardim',      name:'Ligar os fios do portão',    icon:'🔌', x:1520, y:1190 },
  { id:'pocao',      room:'laboratorio', name:'Misturar a poção',           icon:'⚗️', x:1960, y:1020 },
  { id:'telescopio', room:'torre',       name:'Girar o telescópio',         icon:'🔭', x:210,  y:140 },
  { id:'velas',      room:'capela',      name:'Acender as velas',           icon:'🕯️', x:800,  y:1040 },
  { id:'mesa',       room:'jantar',      name:'Arrumar a mesa',             icon:'🍽️', x:1690, y:560 },
  { id:'janela',     room:'quarto',      name:'Fechar a janela',            icon:'🪟', x:1300, y:120 },
  { id:'quadros',    room:'galeria',     name:'Endireitar os quadros',      icon:'🖼️', x:1770, y:120 },
  { id:'forca',      room:'porao',       name:'Religar a caixa de força',   icon:'⚡', x:420,  y:1000 },
  { id:'bau',        room:'sotao',       name:'Abrir o baú com a senha',    icon:'🧰', x:780,  y:130 },
  { id:'caldeirao',  room:'cozinha',     name:'Mexer o caldeirão',          icon:'🍲', x:2300, y:540 },
  { id:'escada',     room:'salao',       name:'Limpar a escada',            icon:'🧹', x:1020, y:470 },
];

// Decorações simples por cômodo (desenhadas em canvas). type define o desenho.
const DECOR = [
  // Torre
  { type:'window',   x:140, y:80,  w:60, h:40 },
  { type:'telescope',x:200, y:120 },
  // Sótão
  { type:'chest',    x:760, y:110 },
  { type:'boxes',    x:480, y:90 },
  { type:'web',      x:840, y:70 },
  // Quarto
  { type:'bed',      x:990, y:100 },
  { type:'window',   x:1280, y:80, w:70, h:50 },
  { type:'rug',      x:1150, y:200, w:160, h:70 },
  // Galeria
  { type:'painting', x:1520, y:85, c:'#b33' },
  { type:'painting', x:1640, y:85, c:'#36b' },
  { type:'painting', x:1760, y:85, c:'#3a3' },
  { type:'painting', x:1880, y:85, c:'#a6a' },
  { type:'painting', x:1990, y:85, c:'#da3' },
  // Biblioteca
  { type:'shelf',    x:100, y:480, w:200 },
  { type:'shelf',    x:330, y:480, w:190 },
  { type:'table',    x:280, y:650 },
  // Salão
  { type:'stairs',   x:960, y:440 },
  { type:'carpet',   x:900, y:600, w:240, h:200 },
  { type:'button',   x:1020, y:690 },
  { type:'candel',   x:730, y:450 },
  { type:'candel',   x:1300, y:450 },
  // Jantar
  { type:'dtable',   x:1580, y:560 },
  { type:'candel',   x:1500, y:480 },
  // Cozinha
  { type:'stove',    x:2030, y:480 },
  { type:'cauldron', x:2290, y:540 },
  { type:'knives',   x:2150, y:480 },
  // Porão
  { type:'powerbox', x:420, y:960 },
  { type:'barrel',   x:120, y:980 },
  { type:'barrel',   x:170, y:1010 },
  { type:'cage',     x:260, y:1120 },
  // Capela
  { type:'altar',    x:800, y:990 },
  { type:'bench',    x:680, y:1130 }, { type:'bench',    x:860, y:1130 },
  { type:'bench',    x:680, y:1190 }, { type:'bench',    x:860, y:1190 },
  // Jardim
  { type:'bush',     x:1140, y:980 }, { type:'bush', x:1560, y:980 },
  { type:'tomb',     x:1250, y:1000 }, { type:'tomb', x:1330, y:1030 },
  { type:'gate',     x:1500, y:1180 },
  { type:'tree',     x:1170, y:1180 },
  // Laboratório
  { type:'bench2',   x:1780, y:980, w:160 },
  { type:'flasks',   x:1960, y:990 },
  { type:'tank',     x:2100, y:1000 },
];

// Passagens secretas (fatia 3) — já deixadas no mapa
const SECRET = [
  { a:'biblioteca', b:'porao',  ax:500, ay:760, bx:460, by:1200 },
  { a:'cozinha',    b:'sotao',  ax:2040, ay:760, bx:480, by:290 },
];
