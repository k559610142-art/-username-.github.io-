// 背包專用收納：同一UID只保留一件實體，以bagStored區分背包／零負重收納位置。
const BAG_STASH_PAGES = [['currency','通貨'],['map','地圖'],['enchant','衝裝卷軸'],['boss','BOSS材料'],['rune','傭兵符石']];
let bagStashPage = 'bag', bagStashTier = 0, bagStashQuality = 'all';
function bagStorageKind(id) {
    const d=ITEMS[id];if(!d)return '';
    if(d.cat==='currency')return 'currency';
    if(d.cat==='map')return 'map';
    if(d.cat==='scroll'&&d.scroll==='enchant')return 'enchant';
    if(BOSS_ENCHANTS[id])return 'boss';
    if(d.cat==='mercRune')return 'rune';
    return '';
}
function bagIsStored(x) { return !!(x && x.bagStored===true && bagStorageKind(x.id)); }
function bagPlaceNew(x) { if(bagStorageKind(x.id))x.bagStored=true;else delete x.bagStored;return x; }
function bagIncomingWeight(id,n=1) { return bagStorageKind(id)?0:(ITEMS[id].wt||0)*n; }
function bagCanReceive(id,n=1,max=calcStats().weightMax) { const wt=bagIncomingWeight(id,n);return !wt||invWeight()+wt<=max; }
function bagStorageNormalize(p) {
    for(const x of p.inv)if(!bagIsStored(x))delete x.bagStored;
    for(const x of [...p.storage,...Object.values(p.equip)])delete x.bagStored;
}
function bagSetPage(page) {
    if(page!=='bag'&&!BAG_STASH_PAGES.some(([id])=>id===page))return;
    bagStashPage=page;renderPanel();
}
function bagStoreAll() {
    let n=0;for(const x of player.inv)if(bagStorageKind(x.id)&&!bagIsStored(x)){x.bagStored=true;n++;}
    saveGame();refreshUI();showToast(n?'已收納 '+n+' 項物品':'沒有需要收納的物品');
}
function bagStore(uid) {
    const x=findInv(uid);if(!x||!bagStorageKind(x.id))return;
    x.bagStored=true;closeDialog();saveGame();refreshUI();
}
function bagChooseWithdraw(uid) {
    const x=findInv(uid),owner=player;if(!bagIsStored(x))return;
    openDialog('取回背包・'+ITEMS[x.id].name,'<p>目前收納 '+fmt(x.n)+' 個</p><label>取回數量<input id="bag-withdraw-qty" type="number" inputmode="numeric" min="1" max="'+x.n+'" value="1"></label>',[
        {text:'取消',cls:'secondary'},
        {text:'取回',keep:true,onClick:()=>{if(player!==owner){closeDialog();return;}bagWithdraw(uid,Number($('bag-withdraw-qty').value));}}
    ]);
}
function bagWithdraw(uid, n) {
    const x=findInv(uid);if(!bagIsStored(x))return;
    if(n===undefined)n=x.n;
    if(!Number.isSafeInteger(n)||n<1||n>x.n){showToast('請輸入有效的取回數量');return;}
    if(invWeight()+(ITEMS[x.id].wt||0)*n>calcStats().weightMax){showToast('背包負重不足，請先騰出空間');return;}
    if(n===x.n)delete x.bagStored;
    else {
        const same=player.inv.find(y=>!bagIsStored(y)&&y.id===x.id&&(y.ench||0)===(x.ench||0)&&!!y.sellLocked===!!x.sellLocked);
        if(same)same.n+=n;else{const moved={...x,uid:player.nextUid++,n};delete moved.bagStored;player.inv.push(moved);}
        x.n-=n;
    }
    closeDialog();saveGame();refreshUI();
}
function bagSetTier(t) { if(!Number.isInteger(t)||t<0||t>MAP_TIERS)return;bagStashTier=t;renderPanel(); }
function bagSetQuality(q) { if(!['all','normal','magic','rare','legend'].includes(q))return;bagStashQuality=q;renderPanel(); }
function bagOpenStored(id) {
    const list=player.inv.filter(x=>bagIsStored(x)&&x.id===id);
    if(list.length===1){openItemDialog(list[0].uid);return;}
    if(!list.length)return;
    openDialog(ITEMS[id].name+'收納',list.map(x=>'<button class="item-row" onclick="openItemDialog('+x.uid+')">'+itemIconHtml(id)+' '+esc(itemName(x))+' ×'+fmt(x.n)+(x.sellLocked?' 🔒':'')+'</button>').join(''));
}
function bagStashSlot(id,list) {
    const n=list.reduce((sum,x)=>sum+x.n,0),first=list[0],name=ITEMS[id].name;
    return '<button class="bag-stash-slot '+(n?'owned':'empty')+'" '+(first?'onclick="bagOpenStored(\''+id+'\')"':'disabled')+' title="'+esc(name)+'"><span class="bag-stash-art">'+itemIconHtml(id)+'</span><strong>'+fmt(n)+'</strong><small>'+esc(name)+'</small></button>';
}
function bagStorageHtml() {
    const list=player.inv.filter(x=>bagIsStored(x)&&bagStorageKind(x.id)===bagStashPage);
    let h='<div class="bag-stash-board"><div class="bag-stash-heading"><b>'+BAG_STASH_PAGES.find(([id])=>id===bagStashPage)[1]+'收納</b><span>'+fmt(list.reduce((n,x)=>n+x.n,0))+' 個 · 零負重</span></div>';
    if(bagStashPage==='map') {
        h+='<div class="bag-tier-tabs"><button class="chip-btn '+(!bagStashTier?'active':'')+'" onclick="bagSetTier(0)">全部</button>';
        for(let t=1;t<=MAP_TIERS;t++){const n=list.filter(x=>ITEMS[x.id].tier===t).length;h+='<button class="chip-btn '+(bagStashTier===t?'active':'')+'" onclick="bagSetTier('+t+')">T'+t+' <small>'+n+'</small></button>';}
        h+='</div><div class="chips">'+[['all','全部品質'],['normal','普通'],['magic','魔法'],['rare','稀有'],['legend','財寶圖']].map(([id,n])=>'<button class="chip-btn '+(bagStashQuality===id?'active':'')+'" onclick="bagSetQuality(\''+id+'\')">'+n+'</button>').join('')+'</div>';
        const rows=[],by={};
        for(const x of list){if(bagStashTier&&ITEMS[x.id].tier!==bagStashTier||bagStashQuality!=='all'&&(x.q||'normal')!==bagStashQuality)continue;const k=mapKindKey(x)+'|'+!!x.sellLocked;if(by[k])by[k].n++;else{const r={x,n:1};by[k]=r;rows.push(r);}}
        rows.sort((a,b)=>ITEMS[a.x.id].tier-ITEMS[b.x.id].tier||qualityRank(a.x)-qualityRank(b.x));
        h+='<div class="bag-stash-grid bag-map-grid">'+(rows.map(({x,n})=>'<button class="bag-stash-slot owned '+itemClass(x)+'" onclick="openItemDialog('+x.uid+')"><span class="bag-stash-art">'+itemIconHtml(x.id)+'</span><strong>×'+fmt(n)+'</strong><small>'+esc(itemName(x))+'</small><em>'+esc((x.mm||[]).filter(k=>MAP_MODS[k]).map(k=>MAP_MODS[k].name).join('、')||(x.unidentified?'尚未鑑定':'無詞綴'))+(x.sellLocked?' · 🔒':'')+'</em></button>').join('')||'<p class="muted">此分類尚無地圖</p>')+'</div>';
    } else {
        const ids=Object.keys(ITEMS).filter(id=>bagStorageKind(id)===bagStashPage);
        if(bagStashPage==='rune') {
            for(const [group,title]of Object.entries(MERC_GROUPS)){h+='<h4>'+title+'系</h4><div class="bag-stash-grid">'+ids.filter(id=>MERC_RUNES[ITEMS[id].rune].group===group).map(id=>bagStashSlot(id,list.filter(x=>x.id===id))).join('')+'</div>';}
        } else h+='<div class="bag-stash-grid">'+ids.map(id=>bagStashSlot(id,list.filter(x=>x.id===id))).join('')+'</div>';
    }
    return h+'</div>';
}
