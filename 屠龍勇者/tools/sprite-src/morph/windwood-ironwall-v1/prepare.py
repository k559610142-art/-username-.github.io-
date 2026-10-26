"""Pack generated RGBA poses without altering their artwork; retain registration/audit."""
from pathlib import Path
from PIL import Image
import numpy as np
import json
import hashlib
import runpy

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[3] / 'images/sprites/morph/windwood-ironwall-v1'
DIRS = ['down', 'right', 'up']
MS = {'walk': 130, 'attack': 140, 'cast': 220, 'hit': 150}
CELL, FOOT = (384, 320), (192, 270)
isolate = runpy.run_path(str(ROOT.parent/'sky-valkyrie-v1/prepare.py'))['isolate']


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/'frames').mkdir(exist_ok=True)
    sources, specs = {}, {}
    for direction in DIRS:
        src = Image.open(ROOT/(direction+'-generated.png')).convert('RGBA')
        sources[direction] = src
        specs[direction] = []
        w, h = src.size
        for i in range(12):
            row, col = divmod(i, 4)
            right = (col+1)*w/4
            rect = [round(col*w/4), round(row*h/3), min(w, round(right)), round((row+1)*h/3)]
            rgba = np.array(src.crop(rect))
            assert (rgba[:, :, 3] == 0).mean() > .15, 'Need genuine alpha'
            # Dark clothing and warm skin identify the body, excluding blue aura.
            rgb = rgba[:, :, :3].astype(int)
            skin = (rgb[:, :, 0] > rgb[:, :, 2]*1.2) & (rgb[:, :, 0] > rgb[:, :, 1]*1.08)
            mask = (rgba[:, :, 3] > 220) & ((rgb.max(axis=2) < 150) | skin)
            mask[:, :round(mask.shape[1]*.22)] = False
            mask[:, round(mask.shape[1]*.78):] = False
            ys, xs = np.nonzero(mask)
            assert len(xs) > 300, (direction, i)
            bottom = int(np.quantile(ys, .995))
            feet = xs[ys >= bottom-24]
            fx = float((int(feet.min())+int(feet.max()))/2)
            specs[direction].append({'rect': rect, 'foot': [rect[0]+fx, rect[1]+bottom+1], 'body': bottom-int(ys.min())+1})
        body = float(np.median([c['body'] for c in specs[direction][:4]]))
        for c in specs[direction]: c['body'] = body
    (ROOT/'registration.json').write_text(json.dumps(specs, indent=2)+'\n', encoding='utf-8')
    manifest = {'id': 'windwood-ironwall-v1', 'name': '風木鐵壁重裝兵（藍變）', 'form': 'm28',
                'rows': DIRS, 'left': 'mirror right', 'cellW': 384, 'cellH': 320,
                'footAnchor': list(FOOT), 'charH': 160, 'drawH': 48, 'actions': {}}
    hashes, audit = set(), []
    contact = Image.new('RGBA', (1536, 3840))
    for ai, (action, ms) in enumerate(MS.items()):
        n = 4 if action in ['walk', 'attack'] else 2
        sheet = Image.new('RGBA', (384*n, 960))
        meta = {'src': f'images/sprites/morph/windwood-ironwall-v1/{action}.png', 'cellW': 384, 'cellH': 320,
                'frames': dict.fromkeys(DIRS, n), 'ms': ms, 'cells': []}
        for di, direction in enumerate(DIRS):
            for f in range(n):
                i = f if action == 'walk' else 4+f if action == 'attack' else 8+f if action == 'cast' else 10+f
                cfg = specs[direction][i]
                crop = isolate(sources[direction].crop(cfg['rect']))
                bb = crop.getbbox(); assert bb
                scale = 160/cfg['body']
                crop = crop.crop(bb)
                crop = crop.resize((round(crop.width*scale), round(crop.height*scale)), Image.Resampling.LANCZOS)
                dx = round(FOOT[0]+(cfg['rect'][0]+bb[0]-cfg['foot'][0])*scale)
                dy = round(FOOT[1]+(cfg['rect'][1]+bb[1]-cfg['foot'][1])*scale)
                assert dx > 0 and dy > 0 and dx+crop.width < 384 and dy+crop.height < 320, (direction, action, f, dx, dy, crop.size)
                cell = Image.new('RGBA', CELL); cell.alpha_composite(crop, (dx, dy))
                digest = hashlib.sha256(cell.tobytes()).hexdigest(); assert digest not in hashes
                hashes.add(digest)
                filename = f'{action}-{direction}-{f+1:02}.png'
                cell.save(OUT/'frames'/filename, optimize=True)
                sheet.alpha_composite(cell, (f*384, di*320))
                contact.alpha_composite(cell, (f*384, (ai*3+di)*320))
                info = {'direction': direction, 'frame': f, 'file': 'frames/'+filename,
                        'source': direction+'-generated.png', 'sourceRect': cfg['rect'], 'sourceFoot': cfg['foot'], 'sourceBodyHeight': cfg['body']}
                meta['cells'].append(info); audit.append(dict(info, bounds=cell.getbbox()))
        sheet.save(OUT/(action+'.png'), optimize=True)
        manifest['actions'][action] = meta
    contact.resize((768, 1920), Image.Resampling.LANCZOS).save(OUT/'contact.png')
    (OUT/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    (ROOT/'audit.json').write_text(json.dumps(audit, indent=2)+'\n', encoding='utf-8')
    for action, meta in manifest['actions'].items():
        sheet = Image.open(OUT/(action+'.png')).convert('RGBA')
        for c in meta['cells']:
            d, f = DIRS.index(c['direction']), c['frame']
            assert sheet.crop((f*384, d*320, (f+1)*384, (d+1)*320)).tobytes() == Image.open(OUT/c['file']).convert('RGBA').tobytes()
    print('PASS: 36 unique RGBA poses, margin and foot registration, exact atlas correspondence')


if __name__ == '__main__': main()
