// 原創傭兵符石：保留image_gen原稿，等比縮為128px透明PNG並產生總覽。
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), source = path.join(__dirname, 'icon-src', 'mercenary-runes-v1');
const runtime = path.join(process.env.USERPROFILE, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules');
function dependency(name) { try { return require(name); } catch { return require(path.join(runtime, name)); } }
const sharp = dependency('sharp'), { createCanvas, loadImage } = dependency('@napi-rs/canvas');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
const out = path.join(root, 'images', 'icons', 'items', 'mercRune-v1');
const colors = { summon: '#b991f0', guard: '#74adf5', support: '#e2c870', battle: '#ef8980', survival: '#80c99b', arcane: '#7bd9e9' };
const names = { summon: '召喚', guard: '守護', support: '補助', battle: '戰鬥', survival: '生存', arcane: '秘術' };
async function main() {
    assert.equal(manifest.entries.length, 50);
    assert.equal(new Set(manifest.entries.map(x => x.id)).size, 50);
    fs.mkdirSync(out, { recursive: true });
    const hashes = new Set(), report = [];
    for (const entry of manifest.entries) {
        const original = path.join(source, 'originals', entry.id + '.png'), target = path.join(out, entry.id + '.png');
        const meta = await sharp(original).metadata(); assert(meta.hasAlpha, entry.id + '原稿缺透明通道');
        await sharp(original).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(target);
        const bytes = fs.readFileSync(target), hash = crypto.createHash('sha256').update(bytes).digest('hex');
        assert(!hashes.has(hash), entry.id + '重複圖案'); hashes.add(hash);
        const { data, info } = await sharp(target).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.equal(info.width, 128); assert.equal(info.height, 128);
        let transparent = 0, visible = 0;
        for (let i = 3; i < data.length; i += 4) { if (data[i] === 0) transparent++; if (data[i] >= 32) visible++; }
        assert(transparent > 100, entry.id + '沒有透明背景'); assert(visible > 2500, entry.id + '圖案太小或空白');
        report.push({ id: entry.id, name: entry.name, group: entry.group, width: 128, height: 128, transparent, visible, sha256: hash });
    }
    const width = 1160, cellW = 116, cellH = 150, header = 62;
    const canvas = createCanvas(width, header + cellH * 5), ctx = canvas.getContext('2d');
    ctx.fillStyle = '#131511'; ctx.fillRect(0, 0, width, canvas.height);
    ctx.fillStyle = '#eadcb2'; ctx.font = 'bold 24px Microsoft JhengHei, sans-serif'; ctx.fillText('黑暗大陸 · 傭兵技能符石', 20, 30);
    ctx.fillStyle = '#a9a99d'; ctx.font = '13px Microsoft JhengHei, sans-serif'; ctx.fillText('50款獨立原創圖案｜六類共用｜128 × 128 透明PNG', 20, 51);
    for (let i = 0; i < manifest.entries.length; i++) {
        const entry = manifest.entries[i], x = i % 10 * cellW, y = header + Math.floor(i / 10) * cellH;
        ctx.fillStyle = '#22241f'; ctx.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);
        ctx.drawImage(await loadImage(path.join(out, entry.id + '.png')), x + 10, y + 5, 96, 96);
        ctx.fillStyle = '#eee5ce'; ctx.font = '12px Microsoft JhengHei, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(entry.name, x + cellW / 2, y + 117, cellW - 8);
        ctx.fillStyle = colors[entry.group]; ctx.font = '11px Microsoft JhengHei, sans-serif'; ctx.fillText(names[entry.group], x + cellW / 2, y + 135);
    }
    fs.writeFileSync(path.join(source, 'contact.png'), canvas.toBuffer('image/png'));
    fs.writeFileSync(path.join(source, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('PASS：50張獨立128×128 PNG、透明背景與非空圖案、SHA256唯一；總覽已輸出。');
}
main().catch(e => { console.error(e); process.exit(1); });
