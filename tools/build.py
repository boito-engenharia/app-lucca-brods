"""Gera brods.html (arquivo unico) a partir de src/ + assets/sprites/.
Uso: python tools/build.py
"""
import base64, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
SPR = os.path.join(ROOT, 'assets', 'sprites')
OUT = os.path.join(ROOT, 'brods.html')

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

sprites = {}
for f in sorted(os.listdir(SPR)):
    if f.endswith('.png'):
        with open(os.path.join(SPR, f), 'rb') as fh:
            sprites[f[:-4]] = 'data:image/png;base64,' + base64.b64encode(fh.read()).decode()

html = read(os.path.join(SRC, 'index.html'))
css = read(os.path.join(SRC, 'style.css'))
js_parts = [read(os.path.join(SRC, n)) for n in ['data.js', 'minigames.js', 'game.js']]
js = '\n'.join(js_parts)

html = html.replace('/*__CSS__*/', css)
html = html.replace('/*__SPRITES__*/', 'const SPRITE_DATA = ' + json.dumps(sprites) + ';')
html = html.replace('/*__JS__*/', js)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print('ok ->', OUT, f'{os.path.getsize(OUT)//1024} KB')
