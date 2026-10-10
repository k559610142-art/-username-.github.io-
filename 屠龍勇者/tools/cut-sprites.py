#!/usr/bin/env python3
# 屠龍勇者：切人物動作表（ARCHITECTURE.md 第 18.2 節）。Linux／Mac 用；Windows 原本的 cut-sprites.ps1 仍可用。
# 適用「深灰（中性灰）格子背景＋有顏色的角色」的動作表（法師、戰士 2026-10-10）。需要 Pillow：pip install pillow
#
#   python3 tools/cut-sprites.py tools/sprite-src/mage-walk.json [--preview 預覽.png]
#
# 規格 JSON：
#   sheet 原圖、out 輸出 PNG、charH 角色在輸出圖中的身高（113，與 classes.js 一致）、
#   tol 背景容差（亮度差，預設 20）、inset 裁切框內縮（避開格線，預設 3）、pad 輸出四周留白（預設 4）、
#   bodyH 指定原圖身高（不指定就用 down／right 各格量到的中位數；同一角色各動作用同一個值，切換動作時大小才一致）、
#   shadow 地面陰影：比背景暗、中性灰的點也當背景（預設 true）、
#   glow 光暈模式：從背景往內遇到平滑、比背景亮的光暈點改成半透明，碰到輪廓線停（true／"blue" 藍光、"warm" 火焰與金光、"any" 兩種都算）、
#   glowSat 暖色光暈的最低飽和度（RGB 最大最小差，預設 60；火焰外圍有淡紅霧時用 8）、
#   glowSmooth 光暈「平滑」的門檻（和上下左右的最大色差，預設 14；火焰紋理粗用 26）、
#   holes 被刀光、光環圍住的背景：面積 ≥ 這個像素數的「像背景」區塊也當背景（0＝不處理）、
#   dirs.down／right／up：每格 [x, y, w, h]（照播放順序；可寫 {"r": [...], "flip": true} 左右鏡像）。
# 去背：每格以四周邊框的中位數當背景色，從邊緣洪水填滿「中性灰（RGB 最大最小差 ≤ 14）且接近背景亮度」的點；
#   與背景相鄰、色差不大的點給半透明並扣掉背景色（藍色光暈自然淡出）；碰到邊緣的小碎塊去掉。
# 對齊：腳底＝不透明點最下緣；水平＝頭部（上方 35% 的暗色點）中心；所有格同尺寸、腳底貼齊底部。
import json, sys
from collections import deque
from PIL import Image

def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def cut_cell(sheet, box, tol, inset, shadow, glow=False, holes=0, glow_sat=60, glow_smooth=14):
    x, y, w, h = box[:4]
    im = sheet.crop((x + inset, y + inset, x + w - inset, y + h - inset)).convert('RGB')
    W, H = im.size
    px = im.load()
    border = [px[i, 0] for i in range(W)] + [px[i, H - 1] for i in range(W)] + [px[0, j] for j in range(H)] + [px[W - 1, j] for j in range(H)]
    lums = sorted(sum(c) / 3 for c in border)
    bg = lums[len(lums) // 2]
    def neutral(c): return max(c) - min(c) <= 14
    def bglike(c):
        l = sum(c) / 3
        if not neutral(c): return False
        if abs(l - bg) <= tol: return True
        return shadow and bg - 26 <= l < bg   # 地面陰影
    lum = lambda c: sum(c) / 3
    def smooth(i, j):
        c = px[i, j]
        for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
            if 0 <= a < W and 0 <= b < H:
                n = px[a, b]
                if max(abs(c[0] - n[0]), abs(c[1] - n[1]), abs(c[2] - n[2])) > glow_smooth: return False
        return True
    def glowlike(i, j):
        # 光暈：疊在灰底上的半透明藍光——平滑、比背景亮或差不多、偏藍（不是角色的輪廓線與花紋）
        c = px[i, j]
        if not glow or not (bg - 8 <= lum(c) <= bg + 150) or not smooth(i, j): return False
        blue = c[2] >= c[0] + 4
        warm = c[0] >= c[2] + max(4, glow_sat * 0.4) and max(c) - min(c) >= glow_sat   # 火焰、金光：飽和的暖色（紅比藍多的門檻隨 glowSat 調整）
        return blue if glow in (True, 'blue') else warm if glow == 'warm' else (blue or warm)
    isglow = [[False] * H for _ in range(W)]
    # 洪水填滿背景
    isbg = [[False] * H for _ in range(W)]
    q = deque()
    for i in range(W):
        for j in (0, H - 1):
            if bglike(px[i, j]) and not isbg[i][j]: isbg[i][j] = True; q.append((i, j))
    for j in range(H):
        for i in (0, W - 1):
            if bglike(px[i, j]) and not isbg[i][j]: isbg[i][j] = True; q.append((i, j))
    while q:
        i, j = q.popleft()
        for a, b in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
            if 0 <= a < W and 0 <= b < H and not isbg[a][b] and not isglow[a][b]:
                if bglike(px[a, b]): isbg[a][b] = True; q.append((a, b))
                elif glowlike(a, b): isglow[a][b] = True; q.append((a, b))
    # 被刀光、光環圍住的大塊背景（洪水填滿碰不到）：面積 ≥ holes 的「像背景」區塊也當背景
    if holes:
        seen = [[False] * H for _ in range(W)]
        for i in range(W):
            for j in range(H):
                if isbg[i][j] or isglow[i][j] or seen[i][j] or not bglike(px[i, j]): continue
                comp = []; q = deque([(i, j)]); seen[i][j] = True
                while q:
                    a, b = q.popleft(); comp.append((a, b))
                    for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                        if 0 <= c < W and 0 <= d < H and not seen[c][d] and not isbg[c][d] and bglike(px[c, d]):
                            seen[c][d] = True; q.append((c, d))
                if len(comp) >= holes:
                    for a, b in comp: isbg[a][b] = True
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    op = out.load()
    for i in range(W):
        for j in range(H):
            if isbg[i][j]: continue
            r, g, b = px[i, j]
            if isglow[i][j]:   # 光暈：依和背景的色差給透明度，扣掉背景色
                d = max(abs(r - bg), abs(g - bg), abs(b - bg))
                al = max(0.0, min(1.0, (d - tol * 0.3) / (tol * 4)))
                if al <= 0.03: continue
                op[i, j] = tuple(int(max(0, min(255, (v - bg * (1 - al)) / al))) for v in (r, g, b)) + (int(al * 255),)
                continue
            # 靠近背景的點：依色差給半透明，扣掉背景色（光暈淡出）
            near = any(0 <= a < W and 0 <= c < H and isbg[a][c] for a in (i - 2, i, i + 2) for c in (j - 2, j, j + 2))
            if near:
                d = max(abs(r - bg), abs(g - bg), abs(b - bg))
                al = max(0.0, min(1.0, (d - tol * 0.4) / (tol * 2.2)))
                if al <= 0.02: continue
                r = int(max(0, min(255, (r - bg * (1 - al)) / al)))
                g = int(max(0, min(255, (g - bg * (1 - al)) / al)))
                b = int(max(0, min(255, (b - bg * (1 - al)) / al)))
                op[i, j] = (r, g, b, int(al * 255))
            else:
                op[i, j] = (r, g, b, 255)
    # 去掉小碎塊（只留面積 ≥ 主體 4% 的連通塊）
    seen = [[False] * H for _ in range(W)]
    blobs = []
    for i in range(W):
        for j in range(H):
            if seen[i][j] or op[i, j][3] < 40: continue
            comp = []; q = deque([(i, j)]); seen[i][j] = True
            while q:
                a, b = q.popleft(); comp.append((a, b))
                for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                    if 0 <= c < W and 0 <= d < H and not seen[c][d] and op[c, d][3] >= 40:
                        seen[c][d] = True; q.append((c, d))
            blobs.append(comp)
    if blobs:
        big = max(len(c) for c in blobs)
        for comp in blobs:
            if len(comp) < big * 0.04:
                for a, b in comp: op[a, b] = (0, 0, 0, 0)
    return out

def measure(img):
    """回傳 (頂, 底, 頭部中心 x)。"""
    W, H = img.size
    p = img.load()
    rows = [j for j in range(H) if any(p[i, j][3] > 100 for i in range(W))]
    if not rows: return None
    top, bot = rows[0], rows[-1]
    lim = top + (bot - top) * 0.35
    xs = [i for j in range(top, int(lim) + 1) for i in range(W) if p[i, j][3] > 200 and sum(p[i, j][:3]) / 3 < 70]
    if not xs: xs = [i for j in range(top, int(lim) + 1) for i in range(W) if p[i, j][3] > 100]
    xs.sort()
    return top, bot, xs[len(xs) // 2]

def main():
    spec_path = sys.argv[1]
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    s = load(spec_path)
    sheet = Image.open(s['sheet']).convert('RGB')
    tol, inset, pad = s.get('tol', 20), s.get('inset', 3), s.get('pad', 4)
    cells = {}
    for d in ('down', 'right', 'up'):
        cells[d] = []
        for c in s['dirs'][d]:
            box = c['r'] if isinstance(c, dict) else c
            img = cut_cell(sheet, box, tol, inset, s.get('shadow', True), s.get('glow', False), s.get('holes', 0), s.get('glowSat', 60), s.get('glowSmooth', 14))
            if isinstance(c, dict) and c.get('flip'): img = img.transpose(Image.FLIP_LEFT_RIGHT)
            cells[d].append(img)
    ms = {d: [measure(im) for im in cells[d]] for d in cells}
    body = s.get('bodyH')
    if not body:
        hs = sorted(m[1] - m[0] for d in ('down', 'right') for m in ms[d] if m)
        body = hs[len(hs) // 2]
    scale = s['charH'] / body
    # 縮放後每格：以頭部中心為水平中心、腳底貼齊
    left = right = up = 0
    scaled = {}
    for d in cells:
        scaled[d] = []
        for im, m in zip(cells[d], ms[d]):
            W, H = im.size
            sim = im.resize((max(1, round(W * scale)), max(1, round(H * scale))), Image.LANCZOS)
            if not m: m = (0, H - 1, W // 2)
            cx, foot, top = m[2] * scale, m[1] * scale, m[0] * scale
            # 實際內容範圍
            bb = sim.getbbox() or (0, 0, 1, 1)
            left = max(left, cx - bb[0]); right = max(right, bb[2] - cx); up = max(up, foot - bb[1])
            scaled[d].append((sim, cx, foot))
    cw = int(round(max(left, right) * 2 + pad * 2)); ch = int(round(up + pad * 2))
    cols = max(len(scaled[d]) for d in scaled)
    sheet_out = Image.new('RGBA', (cw * cols, ch * 3), (0, 0, 0, 0))
    for r, d in enumerate(('down', 'right', 'up')):
        for k, (sim, cx, foot) in enumerate(scaled[d]):
            ox = int(round(k * cw + cw / 2 - cx)); oy = int(round(r * ch + ch - pad - foot))
            sheet_out.paste(sim, (ox, oy), sim)
    sheet_out.save(s['out'], optimize=True)
    print(f"{s['out']}: cellW {cw}, cellH {ch}, frames down {len(scaled['down'])} / right {len(scaled['right'])} / up {len(scaled['up'])}, bodyH {body}, scale {scale:.3f}")
    if preview:
        bgp = Image.new('RGBA', sheet_out.size, (90, 120, 80, 255))
        bgp.alpha_composite(sheet_out)
        bgp.convert('RGB').save(preview)

if __name__ == '__main__':
    main()
