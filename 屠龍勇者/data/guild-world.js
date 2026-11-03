// 公會地區探索：安全通行格與有界圖塊快取。
'use strict';
// 大型場景候選基礎。mask須為已含腳底範圍／牆邊留白的安全站立中心格。
// 碰撞全圖常駐，圖片另按分塊與記憶體預算載入；此類別不代替美術碰撞標定。
class GuildWorld {
    constructor(width, height, walkMask, chunkSize = 32) {
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 1024 || height > 1024
            || !(walkMask instanceof Uint8Array) || walkMask.length !== width * height || !Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 64) throw Error('invalid_world');
        this.width = width; this.height = height; this.mask = walkMask.slice(); this.chunkSize = chunkSize;
        this.explored = new Uint8Array(width * height);
    }
    canStand(x, y) { return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.width && y < this.height && this.mask[y * this.width + x] === 1; }
    neighbors(x, y) {
        const out = [];
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            if (this.canStand(x + dx, y + dy) && (!dx || !dy || this.canStand(x + dx, y) && this.canStand(x, y + dy))) out.push([x + dx, y + dy]);
        }
        return out;
    }
    path(start, target, maxVisited = this.mask.length) {
        if (!Array.isArray(start) || !Array.isArray(target) || !this.canStand(...start) || !this.canStand(...target)
            || !Number.isInteger(maxVisited) || maxVisited < 1) return null;
        const a = start[1] * this.width + start[0], b = target[1] * this.width + target[0], prev = new Int32Array(this.mask.length);
        prev.fill(-1); prev[a] = a;
        const queue = new Int32Array(this.mask.length); queue[0] = a; let head = 0, tail = 1, reached = a === b;
        while (head < tail && head < maxVisited && !reached) {
            const n = queue[head++];
            for (const [x, y] of this.neighbors(n % this.width, Math.floor(n / this.width))) {
                const k = y * this.width + x;
                if (prev[k] >= 0) continue;
                prev[k] = n; queue[tail++] = k;
                if (k === b) { reached = true; break; }
            }
        }
        if (!reached) return null;
        const out = [];
        for (let n = b; n !== a; n = prev[n]) out.push([n % this.width, Math.floor(n / this.width)]);
        return out.reverse();
    }
    move(actor, next) {
        if (!actor || !Array.isArray(next) || !this.canStand(actor.x, actor.y) || !this.canStand(...next)) return false;
        const dx = next[0] - actor.x, dy = next[1] - actor.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || dx && dy && (!this.canStand(actor.x + dx, actor.y) || !this.canStand(actor.x, actor.y + dy))) return false;
        actor.x = next[0]; actor.y = next[1]; return true;
    }
    reveal(x, y, radius) {
        if (!this.canStand(x, y) || !Number.isInteger(radius) || radius < 0 || radius > 32) return false;
        for (let yy = Math.max(0, y - radius); yy <= Math.min(this.height - 1, y + radius); yy++) {
            for (let xx = Math.max(0, x - radius); xx <= Math.min(this.width - 1, x + radius); xx++) {
                if ((xx - x) ** 2 + (yy - y) ** 2 <= radius ** 2) this.explored[yy * this.width + xx] = 1;
            }
        }
        return true;
    }
    exportExplored() {
        const chunks = {}, size = this.chunkSize;
        for (let cy = 0; cy < Math.ceil(this.height / size); cy++) for (let cx = 0; cx < Math.ceil(this.width / size); cx++) {
            let bits = '', any = false;
            for (let j = 0; j < size * size; j += 4) {
                let nibble = 0;
                for (let k = 0; k < 4 && j + k < size * size; k++) {
                    const x = cx * size + (j + k) % size, y = cy * size + Math.floor((j + k) / size);
                    if (x < this.width && y < this.height && this.explored[y * this.width + x]) { nibble |= 1 << k; any = true; }
                }
                bits += nibble.toString(16);
            }
            if (any) chunks[cx + ':' + cy] = bits;
        }
        return chunks;
    }
    importExplored(chunks) {
        if (!chunks || typeof chunks !== 'object' || Array.isArray(chunks)) return false;
        const size = this.chunkSize, length = Math.ceil(size * size / 4);
        for (const [key, bits] of Object.entries(chunks)) {
            if (!/^\d+:\d+$/.test(key) || typeof bits !== 'string' || bits.length !== length || !/^[0-9a-f]+$/.test(bits)) continue;
            const [cx, cy] = key.split(':').map(Number);
            if (cx >= Math.ceil(this.width / size) || cy >= Math.ceil(this.height / size)) continue;
            for (let j = 0; j < size * size; j++) if (parseInt(bits[Math.floor(j / 4)], 16) & (1 << j % 4)) {
                const x = cx * size + j % size, y = cy * size + Math.floor(j / size);
                if (x < this.width && y < this.height) this.explored[y * this.width + x] = 1;
            }
        }
        return true;
    }
    visibleChunks(rect, margin = 1) {
        if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0
            || !Number.isInteger(margin) || margin < 0 || margin > 3) return [];
        const s = this.chunkSize, out = [];
        const x0 = Math.max(0, Math.floor(rect.x / s) - margin), y0 = Math.max(0, Math.floor(rect.y / s) - margin);
        const x1 = Math.min(Math.ceil(this.width / s) - 1, Math.ceil((rect.x + rect.width) / s) - 1 + margin);
        const y1 = Math.min(Math.ceil(this.height / s) - 1, Math.ceil((rect.y + rect.height) / s) - 1 + margin);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ x, y, key: x + ':' + y });
        return out;
    }
}
class GuildAssetCache {
    constructor(loader, maxBytes = 48 * 1024 * 1024, maxEntries = 12) {
        if (typeof loader !== 'function' || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isSafeInteger(maxEntries) || maxEntries < 1) throw Error('invalid_cache');
        this.loader = loader; this.maxBytes = maxBytes; this.maxEntries = maxEntries; this.entries = new Map(); this.bytes = 0; this.clock = 0;
    }
    async acquire(key) {
        if (typeof key !== 'string' || !key.length || key.length > 200) throw Error('invalid_asset_key');
        let entry = this.entries.get(key);
        if (!entry) {
            entry = { key, refs: 0, touched: ++this.clock, asset: null };
            this.entries.set(key, entry);
            entry.promise = Promise.resolve().then(() => this.loader(key)).then(asset => {
                if (!asset || !Number.isSafeInteger(asset.bytes) || asset.bytes < 0 || typeof asset.dispose !== 'function') { if (asset && typeof asset.dispose === 'function') asset.dispose(); throw Error('invalid_asset'); }
                if (!this.evictFor(asset.bytes, entry) || this.entries.size > this.maxEntries) {
                    asset.dispose(); throw Error('asset_budget');
                }
                entry.asset = asset; this.bytes += asset.bytes; return asset;
            }).catch(error => { if (this.entries.get(key) === entry) this.entries.delete(key); throw error; });
        }
        entry.refs++; entry.touched = ++this.clock;
        let asset;
        try { asset = await entry.promise; } catch (error) { entry.refs--; throw error; }
        let released = false;
        return { value: asset.value, release: () => { if (released) return; released = true; entry.refs--; entry.touched = ++this.clock; } };
    }
    evictFor(bytes, except) {
        if (bytes > this.maxBytes) return false;
        const candidates = [...this.entries.values()].filter(e => e !== except && e.refs === 0 && e.asset).sort((a, b) => a.touched - b.touched);
        while ((this.bytes + bytes > this.maxBytes || this.entries.size > this.maxEntries) && candidates.length) this.dispose(candidates.shift());
        return this.bytes + bytes <= this.maxBytes && this.entries.size <= this.maxEntries;
    }
    dispose(entry) {
        if (!entry || entry.refs || !entry.asset || this.entries.get(entry.key) !== entry) return false;
        this.entries.delete(entry.key); this.bytes -= entry.asset.bytes; entry.asset.dispose(); return true;
    }
    clearUnused() { for (const e of [...this.entries.values()]) this.dispose(e); }
}

