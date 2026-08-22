"""Recorta os sprites das pranchas do Lucca (assets/*-sheet.png) com bordas suaves.
Uso: python tools/cut_sprites.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets')
OUT = os.path.join(A, 'sprites')
os.makedirs(OUT, exist_ok=True)

def outside_mask(im, light_thresh=165, flood_thresh=70):
    """máscara do fundo (conectado à borda), via flood fill nos tons claros"""
    rgb = im.convert('RGB'); w, h = rgb.size; marker = (255, 0, 255)
    pts = [(x, 0) for x in range(0, w, 4)] + [(x, h - 1) for x in range(0, w, 4)] + [(0, y) for y in range(0, h, 4)] + [(w - 1, y) for y in range(0, h, 4)]
    for p in pts:
        px = rgb.getpixel(p)
        if px != marker and min(px) > light_thresh:
            ImageDraw.floodfill(rgb, p, marker, thresh=flood_thresh)
    a = np.array(rgb)
    return (a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255)

def soft_cut(im, dark_bg=False):
    """recorta com borda suave: pixels de transição viram contorno preto semitransparente"""
    src = np.array(im.convert('RGB')).astype(np.float32)
    if dark_bg:
        # fundo escuro: distância ao fundo mediano da borda
        border = np.concatenate([src[0], src[-1], src[:, 0], src[:, -1]])
        bg = np.median(border, axis=0)
        dist = np.abs(src - bg).sum(axis=2)
        m = Image.fromarray(((dist > 40) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
        rgbm = Image.merge('RGB', [m, m, m]); W, H = rgbm.size
        for p in [(x, 0) for x in range(0, W, 4)] + [(x, H - 1) for x in range(0, W, 4)] + [(0, y) for y in range(0, H, 4)] + [(W - 1, y) for y in range(0, H, 4)]:
            if rgbm.getpixel(p) == (0, 0, 0): ImageDraw.floodfill(rgbm, p, (255, 0, 255))
        r = np.array(rgbm); outside = (r[:, :, 0] == 255) & (r[:, :, 1] == 0)
        alpha = np.where(outside, 0, 255).astype(np.float32)
        # suaviza 1px
        out = np.dstack([src.astype(np.uint8), alpha.astype(np.uint8)])
        img = Image.fromarray(out, 'RGBA')
        a = img.split()[3].filter(ImageFilter.GaussianBlur(.6)); img.putalpha(a)
        return img
    outside = outside_mask(im)
    # região de borda: até 2px para dentro do recorte
    out_img = Image.fromarray((outside * 255).astype(np.uint8))
    grown = np.array(out_img.filter(ImageFilter.MaxFilter(5))) > 0
    edge = grown & ~outside
    L = src.mean(axis=2) / 255.0
    alpha = np.where(outside, 0.0, 1.0)
    # na borda: quanto mais claro, mais transparente; cor vira contorno escuro
    edge_alpha = np.clip((1.0 - L) * 1.35, 0, 1)
    alpha = np.where(edge, edge_alpha, alpha)
    rgb = src.copy()
    rgb[edge] = rgb[edge] * 0.25     # escurece para casar com o contorno preto
    out = np.dstack([rgb.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
    img = Image.fromarray(out, 'RGBA')
    return img

def components(im, min_w=30, gap=2):
    a = np.array(im)[:, :, 3] > 40
    cols = a.sum(axis=0) > 3
    segs = []; start = None; gapc = 0
    for x, c in enumerate(cols):
        if c:
            if start is None: start = x
            gapc = 0
        else:
            if start is not None:
                gapc += 1
                if gapc > gap: segs.append((start, x - gapc)); start = None; gapc = 0
    if start is not None: segs.append((start, len(cols)))
    segs2 = []
    for x0, x1 in segs:
        if x1 - x0 > 200:
            sub = a[:, x0:x1].sum(axis=0); m = x0 + 40 + int(sub[40:-40].argmin()); segs2 += [(x0, m), (m, x1)]
        else: segs2.append((x0, x1))
    out = []
    for x0, x1 in segs2:
        if x1 - x0 < min_w: continue
        sub = a[:, x0:x1]; rows = sub.sum(axis=1) > 0
        blocks = []; s = None
        for y, r in enumerate(rows):
            if r and s is None: s = y
            if not r and s is not None: blocks.append((s, y)); s = None
        if s is not None: blocks.append((s, len(rows)))
        y0, y1 = max(blocks, key=lambda b: b[1] - b[0])
        out.append(im.crop((max(0, x0 - 2), max(0, y0 - 2), x1 + 3, y1 + 3)))
    return out

def band(sheet, box, names):
    im = Image.open(os.path.join(A, sheet)).convert('RGBA').crop(box)
    im = soft_cut(im)
    comps = components(im)
    print(sheet, box, 'found', len(comps), 'want', len(names))
    res = {}
    for n, c in zip(names, comps): res[n] = c
    return res

S = {}
S.update(band('venus-sheet.png', (370, 60, 980, 278), ['venus_front', 'venus_side', 'venus_back', 'venus_q34']))
S.update(band('demom-sheet.png', (360, 40, 1000, 285), ['demom_front', 'demom_side', 'demom_back', 'demom_q34']))
S.update(band('chefe-sheet.png', (360, 40, 1000, 285), ['chefe_front', 'chefe_side', 'chefe_back', 'chefe_q34']))
S.update(band('venus-sheet.png', (990, 345, 1536, 505), ['venus_idle', 'venus_run', 'venus_jump', 'venus_atk']))
S.update(band('demom-sheet.png', (960, 370, 1536, 528), ['demom_idle', 'demom_run', 'demom_jump', 'demom_atk']))
S.update(band('chefe-sheet.png', (950, 372, 1536, 530), ['chefe_idle', 'chefe_run', 'chefe_jump', 'chefe_atk']))
# derrotados
vd = soft_cut(Image.open(os.path.join(A, 'venus-sheet.png')).convert('RGBA').crop((0, 845, 290, 1010)))
a = np.array(vd); a[:22, :150, 3] = 0; vd = Image.fromarray(a, 'RGBA'); S['venus_dead'] = vd.crop(vd.getbbox())
dd = soft_cut(Image.open(os.path.join(A, 'demom-sheet.png')).convert('RGBA').crop((0, 862, 265, 1010)), dark_bg=True)
a = np.array(dd); a[:26, :225, 3] = 0; dd = Image.fromarray(a, 'RGBA'); S['demom_dead'] = dd.crop(dd.getbbox())
cd = soft_cut(Image.open(os.path.join(A, 'chefe-sheet.png')).convert('RGBA').crop((0, 862, 255, 1010)), dark_bg=True)
S['chefe_dead'] = cd.crop(cd.getbbox())
# logo (já tem alpha)
lm = Image.open(os.path.join(A, 'logo-sheet.png')).convert('RGBA').crop((20, 20, 530, 525)); S['logo_main'] = lm
lw = Image.open(os.path.join(A, 'logo-sheet.png')).convert('RGBA').crop((1140, 560, 1520, 745)); S['logo_word'] = lw

heights = {'venus': 160, 'demom': 170, 'chefe': 175}
total = 0
for name, im in S.items():
    if name.startswith('logo'):
        w = 640 if name == 'logo_main' else 480; r = w / im.width; im = im.resize((w, round(im.height * r)), Image.LANCZOS)
    elif name.endswith('_dead'):
        w = 200; r = w / im.width; im = im.resize((w, round(im.height * r)), Image.LANCZOS)
    else:
        h = heights[name.split('_')[0]]; r = h / im.height; im = im.resize((round(im.width * r), h), Image.LANCZOS)
    p = os.path.join(OUT, name + '.webp'); im.save(p, 'WEBP', quality=92, method=6)
    total += os.path.getsize(p)
# remove pngs antigos
for f in os.listdir(OUT):
    if f.endswith('.png'): os.remove(os.path.join(OUT, f))
print('sprites:', len(S), 'total KB', total // 1024)
