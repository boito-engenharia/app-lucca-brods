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
    ext = os.path.splitext(f)[1].lower()
    if ext in ('.png', '.webp'):
        mime = 'image/png' if ext == '.png' else 'image/webp'
        with open(os.path.join(SPR, f), 'rb') as fh:
            sprites[os.path.splitext(f)[0]] = f'data:{mime};base64,' + base64.b64encode(fh.read()).decode()

# arte dos cômodos (assets/comodos/<id>.png -> room_<id>)
COM = os.path.join(ROOT, 'assets', 'comodos')
if os.path.isdir(COM):
    for f in sorted(os.listdir(COM)):
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            mime = 'image/png' if f.lower().endswith('.png') else 'image/webp' if f.lower().endswith('.webp') else 'image/jpeg'
            with open(os.path.join(COM, f), 'rb') as fh:
                sprites['room_' + os.path.splitext(f)[0].lower()] = f'data:{mime};base64,' + base64.b64encode(fh.read()).decode()

html = read(os.path.join(SRC, 'index.html'))
css = read(os.path.join(SRC, 'style.css'))
js_parts = [read(os.path.join(SRC, n)) for n in ['data.js', 'minigames.js', 'render.js', 'game.js', 'ai.js', 'sabotage.js', 'specials.js', 'meeting.js', 'music.js', 'settings.js']]
js = '\n'.join(js_parts)

html = html.replace('/*__CSS__*/', css)
html = html.replace('/*__SPRITES__*/', 'const SPRITE_DATA = ' + json.dumps(sprites) + ';')
html = html.replace('/*__JS__*/', js)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print('ok ->', OUT, f'{os.path.getsize(OUT)//1024} KB')
