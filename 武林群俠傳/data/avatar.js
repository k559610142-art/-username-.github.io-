// 浪跡江湖：人物外觀（原創 SVG 紙娃娃，ARCHITECTURE.md 第 13 節）
// 外觀 = 門派（服裝、髮型）＋ G.look（性別、髮色、膚色）＋ 裝備（兵器種類、品質滾邊、頭冠、靴色、佩飾光環、強化發光）
// 地圖上用 avatarImage() 把 SVG 轉成圖片快取，再由 render.js 畫到 canvas
const LOOK_HAIR = ['#1b1612', '#4a2e1c', '#7a5634', '#c9c2b4', '#5b2a4a'];
const LOOK_SKIN = ['#f6dcc2', '#eac6a0', '#d4a47c', '#a9774f'];
const LOOK_GENDER = [{ id: 'm', name: '男' }, { id: 'f', name: '女' }];

const SECT_LOOK = {
    xuanxiao: { robe: '#e8eef6', robe2: '#5a8ad0', belt: '#2f4f8f' },
    tieyi: { robe: '#8a5a2e', robe2: '#c8a050', belt: '#3b2a18' },
    baicao: { robe: '#e4efd8', robe2: '#5f9c4a', belt: '#7a5634' },
    wuying: { robe: '#2a2236', robe2: '#8e5cc8', belt: '#120e18' },
};

function qColor(it) { return it ? QUALITY[it.q].color : null; }

// 依門派畫頭髮（後髮 back / 前髮 front）
function hairSvg(sect, g, c) {
    if (sect === 'tieyi') {
        if (g === 'f') return { back: `<path d="M38 48 Q36 78 44 92 L50 70Z M82 48 Q84 78 76 92 L70 70Z" fill="${c}"/>`, front: `<path d="M38 46 Q40 24 60 22 Q80 24 82 46 Q72 34 60 34 Q48 34 38 46Z" fill="${c}"/><rect x="38" y="38" width="44" height="5" rx="2" fill="#a8432e"/>` };
        return { back: '', front: `<path d="M40 44 Q42 26 60 25 Q78 26 80 44 Q70 36 60 36 Q50 36 40 44Z" fill="${c}" opacity=".55"/><rect x="38" y="38" width="44" height="5" rx="2" fill="#a8432e"/><path d="M80 40 l10 6 -2 3 -9 -5Z" fill="#a8432e"/>` };
    }
    if (sect === 'wuying') {
        // 兜帽＋面巾，頭髮只露出瀏海
        return {
            back: `<path d="M32 50 Q30 18 60 16 Q90 18 88 50 L90 82 Q60 92 30 82Z" fill="#1d1726"/>`,
            front: `<path d="M36 48 Q38 22 60 21 Q82 22 84 48 Q74 30 60 31 Q46 30 36 48Z" fill="#2a2236"/><path d="M46 38 Q52 30 58 38 Q62 30 70 37" stroke="${c}" stroke-width="4" fill="none"/><path d="M42 54 Q60 62 78 54 L76 66 Q60 72 44 66Z" fill="#120e18"/>`,
        };
    }
    if (sect === 'baicao') {
        const flower = `<g transform="translate(78 30)"><circle r="4" fill="#f08cb0"/><circle r="1.6" fill="#ffe27a"/></g><path d="M74 34 l9 -9" stroke="#5f9c4a" stroke-width="2"/>`;
        if (g === 'f') return { back: `<path d="M36 44 Q34 90 46 108 L56 70Z M84 44 Q86 90 74 108 L64 70Z" fill="${c}"/>`, front: `<path d="M37 48 Q38 22 60 21 Q82 22 83 48 Q76 32 64 32 Q60 40 50 38 Q42 40 37 48Z" fill="${c}"/>${flower}` };
        return { back: `<path d="M40 44 Q38 70 46 84 L56 64Z M80 44 Q82 70 74 84 L64 64Z" fill="${c}"/>`, front: `<path d="M38 46 Q40 22 60 21 Q80 22 82 46 Q74 32 60 33 Q46 32 38 46Z" fill="${c}"/>${flower}` };
    }
    // 玄霄觀：道髻＋髮簪＋飄帶
    const knot = `<circle cx="60" cy="16" r="8" fill="${c}"/><rect x="48" y="14" width="24" height="3" rx="1.5" fill="#e8c066"/><rect x="54" y="18" width="12" height="4" rx="2" fill="#5a8ad0"/><path d="M66 20 Q80 22 88 34 Q78 28 68 24Z" fill="#5a8ad0"/>`;
    if (g === 'f') return { back: `${knot}<path d="M38 44 Q34 86 42 104 L54 68Z M82 44 Q86 86 78 104 L66 68Z" fill="${c}"/>`, front: `<path d="M37 48 Q38 22 60 21 Q82 22 83 48 Q70 30 60 36 Q50 30 37 48Z" fill="${c}"/>` };
    return { back: knot, front: `<path d="M38 46 Q40 22 60 21 Q80 22 82 46 Q70 32 60 36 Q50 32 38 46Z" fill="${c}"/>` };
}

// 兵器：刀／槍／爪／徒手；強化 +5 以上加發光濾鏡
function weaponSvg(it) {
    if (!it) return '';
    const qc = qColor(it), glow = it.plus >= 5 ? `filter="url(#wglow)"` : '';
    const metal = it.q >= 2 ? qc : '#c9d4de';
    if (it.wtype === 'blade') return `<g class="av-weapon" ${glow}><path d="M95 112 L104 48 Q112 52 106 70 L100 113Z" fill="${metal}" stroke="#0005"/><rect x="90" y="110" width="16" height="4" rx="2" fill="#7a5634"/><rect x="95" y="114" width="5" height="12" fill="#3b2a18"/></g>`;
    if (it.wtype === 'spear') return `<g class="av-weapon" ${glow}><rect x="96" y="30" width="4" height="120" rx="2" fill="#7a5634"/><path d="M98 12 l6 18 h-12Z" fill="${metal}" stroke="#0005"/><path d="M92 32 q6 8 12 0" fill="#c8423a"/></g>`;
    // 爪：雙手各三根爪刃
    const claw = x => `<path d="M${x} 100 l-4 -14 M${x + 5} 100 l0 -15 M${x + 10} 100 l4 -14" stroke="${metal}" stroke-width="3" stroke-linecap="round"/><rect x="${x - 2}" y="99" width="14" height="10" rx="3" fill="#4a3424"/>`;
    return `<g class="av-weapon" ${glow}>${claw(91)}${claw(15)}</g>`;
}

// 主函式：p 為角色資料（需有 sect、look、equip），opts.size 為顯示寬度
function avatarSvg(p, opts) {
    opts = opts || {};
    const look = p.look || { g: 'm', hair: 0, skin: 0 };
    const sl = SECT_LOOK[p.sect], eq = p.equip || {};
    const skin = LOOK_SKIN[look.skin] || LOOK_SKIN[0], hc = LOOK_HAIR[look.hair] || LOOK_HAIR[0];
    const trim = qColor(eq.armor) || sl.robe2;
    const boot = qColor(eq.boots) || '#3b2a18';
    const ring = qColor(eq.ring);
    const hair = hairSvg(p.sect, look.g, hc);
    const female = look.g === 'f';
    const size = opts.size || 120;
    const helm = eq.helm ? `<path d="M50 20 L54 10 L60 16 L66 10 L70 20Z" fill="${qColor(eq.helm)}" stroke="#0006"/>` : '';
    const aura = ring ? `<ellipse cx="60" cy="96" rx="44" ry="60" fill="url(#aura)" class="av-aura"/>` : '';
    const skirt = female ? `<path d="M40 104 Q60 100 80 104 L86 138 Q60 144 34 138Z" fill="${sl.robe}" stroke="${trim}" stroke-width="2"/>` : `<path d="M42 104 L78 104 L82 134 L38 134Z" fill="${sl.robe}" stroke="${trim}" stroke-width="2"/>`;
    return `<svg class="avatar ${opts.cls || ''}" viewBox="0 0 120 160" width="${size}" height="${size * 4 / 3}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <radialGradient id="aura"><stop offset="0" stop-color="${ring || '#fff'}" stop-opacity=".45"/><stop offset="1" stop-color="${ring || '#fff'}" stop-opacity="0"/></radialGradient>
  <filter id="wglow"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
${aura}
<ellipse cx="60" cy="152" rx="30" ry="5" fill="#0006"/>
<g class="av-body">
  ${hair.back}
  <rect x="44" y="132" width="12" height="16" rx="3" fill="${boot}"/><rect x="64" y="132" width="12" height="16" rx="3" fill="${boot}"/>
  ${skirt}
  <path d="M40 70 Q60 62 80 70 L82 106 L38 106Z" fill="${sl.robe}" stroke="${trim}" stroke-width="2"/>
  <path d="M60 68 L50 92 M60 68 L70 92" stroke="${sl.robe2}" stroke-width="3" fill="none"/>
  <rect x="38" y="98" width="44" height="7" rx="2" fill="${sl.belt}"/>
  <path d="M40 72 Q26 86 22 104" stroke="${sl.robe}" stroke-width="11" stroke-linecap="round" fill="none"/>
  <path d="M80 72 Q94 86 98 104" stroke="${sl.robe}" stroke-width="11" stroke-linecap="round" fill="none"/>
  <circle cx="22" cy="106" r="5" fill="${skin}"/><circle cx="98" cy="106" r="5" fill="${skin}"/>
  <rect x="54" y="58" width="12" height="10" fill="${skin}"/>
  <ellipse cx="60" cy="46" rx="21" ry="22" fill="${skin}"/>
  <ellipse cx="52" cy="48" rx="2.4" ry="${female ? 3.2 : 2.6}" fill="#1b1612"/><ellipse cx="68" cy="48" rx="2.4" ry="${female ? 3.2 : 2.6}" fill="#1b1612"/>
  <path d="M47 42 l9 -1 M64 41 l9 1" stroke="#1b1612" stroke-width="${female ? 1.2 : 2}"/>
  ${female ? '<ellipse cx="48" cy="55" rx="3" ry="1.6" fill="#f08c8c" opacity=".5"/><ellipse cx="72" cy="55" rx="3" ry="1.6" fill="#f08c8c" opacity=".5"/>' : ''}
  <path d="M56 58 Q60 60 64 58" stroke="#8a4a3a" stroke-width="1.4" fill="none"/>
  ${hair.front}
  ${helm}
  ${weaponSvg(eq.weapon)}
</g>
</svg>`;
}

// 地圖用：SVG 轉成 Image 快取（外觀或裝備變了才重做）
const avatarCache = {};
function avatarKey(p) {
    const eq = p.equip || {};
    return JSON.stringify([p.sect, p.look, SLOTS.map(s => eq[s.id] ? [eq[s.id].q, eq[s.id].plus, eq[s.id].wtype || ''] : 0)]);
}
function avatarImage(p) {
    const key = avatarKey(p);
    if (avatarCache[key]) return avatarCache[key];
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(p, { size: 120 }));
    avatarCache[key] = img;
    return img;
}
