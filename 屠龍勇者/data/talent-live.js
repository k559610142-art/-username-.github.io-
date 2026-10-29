// 正式天賦：操作交給後端交易；試玩仍完全獨立。
const TALENT_SYSTEM_VERSION='talent-20261029k';
const TALENT_TRIAL_TIERS=[1,2,3,4,5,7,9,11,13,15];
let talentLiveMode=false,talentLiveBusy=false,talentTrialCache=null,talentBackendReady=false;
const talentBonusCache=new WeakMap();

function talentItemId(id) { return 'talentJewel_'+id; }
TALENT_JEWEL_CATALOG.forEach(j=>{ITEMS[talentItemId(j.id)]={name:j.name,cat:'talentJewel',talentJewel:j.id,wt:.1,sell:0,desc:j.text||j.mods.map(talentModText).join('；')};});
ITEMS.talentStone={name:'天賦石',cat:'currency',wt:0,sell:0,desc:'正式天賦每退1點消耗1顆；退點失敗不消耗。'};
CAT_NAMES.talentJewel='天賦寶珠';
if(!CAT_ORDER.includes('talentJewel'))CAT_ORDER.unshift('talentJewel');

function talentEmpty() { return {v:null,nodes:[],jewels:{},trials:[]}; }
function talentRuntimeState(p) {
    const t=p.talent||talentEmpty(),jewels={};
    for(const [slot,it] of Object.entries(t.jewels||{})){const d=it&&ITEMS[it.id];if(d&&d.talentJewel)jewels[slot]=d.talentJewel;}
    return {budget:talentPointTotal(p.lv,t.trials).total,allocated:new Set(['origin',...(t.nodes||[])]),jewels,refundStones:(p.inv||[]).filter(it=>it.id==='talentStone').reduce((n,it)=>n+it.n,0)};
}

function talentNormalize(p) {
    const raw=p.talent&&typeof p.talent==='object'?p.talent:talentEmpty();
    const trials=[...new Set((Array.isArray(raw.trials)?raw.trials:[]).filter(id=>TALENT_TRIAL_IDS.includes(id)))];
    const state=talentPlanCreate(talentPointTotal(p.lv,trials).total),wanted=new Set((Array.isArray(raw.nodes)?raw.nodes:[]).filter(id=>typeof id==='string').slice(0,100));
    const used=new Set([...(p.inv||[]),...(p.storage||[]),...Object.values(p.equip||{}),...Object.values(p.mercenary&&p.mercenary.equip||{})].filter(Boolean).map(it=>it.uid));
    const candidates=[],jewels={};
    for(const [id,it] of Object.entries(raw.jewels&&typeof raw.jewels==='object'?raw.jewels:{}).slice(0,24)){
        const d=it&&ITEMS[it.id];if(!d||!d.talentJewel||it.n!==1||!Number.isSafeInteger(it.uid)||it.uid<1||used.has(it.uid))continue;
        used.add(it.uid);candidates.push([id,it]);
    }
    const learn=()=>{for(let pass=0;pass<101;pass++){let changed=false;for(const n of talentPlanScene(state).nodes)if(wanted.has(n.id)&&!state.allocated.has(n.id)&&talentPlanAllocate(state,n.id).ok)changed=true;if(!changed)break;}};
    learn();
    for(const [id,it] of candidates){if(talentPlanInsert(state,id,ITEMS[it.id].talentJewel).ok)jewels[id]=it;else p.inv.push(it);}
    learn();
    p.talent={v:raw.v===TALENT_SYSTEM_VERSION?raw.v:null,nodes:[...state.allocated].filter(id=>id!=='origin'),jewels,trials};
    p.nextUid=Math.max(p.nextUid||1,...[...used].filter(Number.isSafeInteger).map(uid=>uid+1));
}

function talentBonuses(p=player) {
    if(!p||!p.talent||p.talent.v!==TALENT_SYSTEM_VERSION)return {mods:{},cores:new Set()};
    const old=talentBonusCache.get(p);if(old&&old.raw===p.talent&&old.lv===p.lv)return old.value;
    const summary=talentPlanSummary(talentRuntimeState(p)),mods={};
    summary.mods.forEach(m=>{mods[m[0]]=(mods[m[0]]||0)+m[1];});
    const scene=talentPlanScene(talentRuntimeState(p)),ids=new Set(p.talent.nodes);
    const cores=new Set(scene.nodes.filter(n=>n.kind==='core'&&ids.has(n.id)).map(n=>Number(n.exclusiveGroup.split('-').pop())));
    const value={mods,cores};talentBonusCache.set(p,{raw:p.talent,lv:p.lv,value});return value;
}

function talentPlayerFx(p) {
    const {mods:m,cores:c}=talentBonuses(p),fx={};
    const fields={'最大生命':'hp','最大魔力':'mp','SP':'sp','防禦':'ac','魔防':'mr','每5秒回血':'hpRegen','每5秒回魔':'mpRegen'};
    for(const [name,key] of Object.entries(fields))if(m[name])fx[key]=m[name];
    for(const [name,key] of Object.entries({'物理暴擊率':'crit','魔法暴擊率':'magicCrit','物理暴擊傷害':'critDmg','魔法暴擊傷害':'magicCritDmg','吸血率':'lifesteal','閃避率':'dodge','額外攻速':'spdMul'}))if(m[name])fx[key]=m[name]/100;
    const w=p.equip&&p.equip.weapon,def=w&&ITEMS[w.id],ranged=def&&WEAPON_TYPES[def.type]&&WEAPON_TYPES[def.type].ranged;
    fx.hit=m[ranged?'遠程命中':'近戰命中']||0;
    if(c.has(4))fx.lifesteal=(fx.lifesteal||0)+.02;
    return fx;
}

function talentManaCost(k,p=player) {
    const {mods:m,cores:c}=talentBonuses(p);
    return Math.max(0,Math.ceil((k.mp||0)*Math.max(.1,1-(m['技能魔力消耗降低']||0)/100)*(c.has(1)?1.15:1)));
}

function talentDamageMult(st,magic,mon) {
    const {mods:m,cores:c}=talentBonuses(),ranged=!!st.ranged;
    let pct=magic?(m['法術傷害']||0)+(c.has(1)?20:0):(m['物理傷害']||0)+(m[ranged?'遠程物理傷害':'近戰物理傷害']||0)+(!ranged&&c.has(0)?20:0);
    if(!magic&&ranged&&c.has(2)){
        let distance=4;
        if(!SIM_MODE&&typeof scene!=='undefined'&&scene&&scene.pl){const target=scene.mons.find(x=>x.inst===mon&&!x.dead);if(target)distance=Math.hypot(target.x-scene.pl.x,target.y-scene.pl.y);}
        pct+=distance>=4?20:distance<=2?-10:0;
    }
    return Math.max(.1,1+pct/100)*(c.has(3)?.92:1)*(c.has(5)?.9:1);
}

function talentIncomingMult(magic) {
    const {mods:m,cores:c}=talentBonuses();
    return Math.max(.1,1-(m[magic?'受到的魔法傷害降低':'受到的物理傷害降低']||0)/100)*(c.has(5)?.9:1);
}

function talentPotionAmount(value) {
    const {mods:m,cores:c}=talentBonuses();return Math.max(0,Math.round(value*(1+(m['藥水回復']||0)/100)*(c.has(4)?.75:1)));
}

function talentMercMult(summon=false) {
    const {mods:m,cores:c}=talentBonuses();return (1+(m['出戰傭兵傷害']||0)/100+(c.has(3)?.15:0))*(summon?1+(m['傭兵召喚物傷害']||0)/100:1);
}

function talentReceiveProof(it,p) {
    if(!/^talentTrial_\d+$/.test(it.id))return false;
    const index=Number(it.id.split('_')[1])-1;if(index<0||index>=10||it.n!==1)throw Error('不正確的天賦試煉憑證');
    const t=p.talent||talentEmpty(),id=TALENT_TRIAL_IDS[index];
    p.talent={...t,v:TALENT_SYSTEM_VERSION,trials:[...new Set([...(t.trials||[]),id])]};return true;
}

function talentLivePlanState(p=player) { return talentRuntimeState(p); }

async function talentOpenCharacterPlanner() {
    if(SIM_MODE||!player||!vaultOnline()){showToast('正式天賦需要登入並同步雲端存檔');return;}
    const who=player,slot=currentSlot,uid=cloudUser.id;
    try {
        saveGame();if(!await cloudSyncedSlot(slot))throw Error('請先完成雲端同步');
        const r=await marketRpc('talent_status',{p_slot:slot,p_char:lootChar()});
        if(player!==who||currentSlot!==slot||!cloudUser||cloudUser.id!==uid)return;
        if(r.version!==TALENT_SYSTEM_VERSION)throw Error('正式天賦尚未開放，等待資料庫更新');
        talentBackendReady=true;player.talent={...(player.talent||talentEmpty()),trials:r.trials};saveGame();
        if(!talentLiveMode)talentTrialCache=talentPlanState;
        talentLiveMode=true;talentPlanState=talentLivePlanState();talentPlanView={selected:'origin',jewelId:null,zoom:1,message:'正式角色配點：每格1點，退1點消耗1顆天賦石。'};
        talentShowPlanner();
    }catch(e){showToast(/function|PGRST202|404/i.test(String(e.message||e))?'正式天賦尚未開放，等待資料庫更新':String(e.message||e));}
}

async function talentLiveAction(action,nodeId,jewelId) {
    if(talentLiveBusy||SIM_MODE||!player)return;
    const who=player,slot=currentSlot,uid=cloudUser&&cloudUser.id;
    let inst=null;
    if(action==='insert'){
        inst=player.inv.find(it=>ITEMS[it.id]&&ITEMS[it.id].talentJewel===jewelId);
        if(!inst){showToast('背包沒有這顆寶珠');return;}
    }
    talentLiveBusy=true;
    try {
        await vaultOp('talent_action',{p_char:lootChar(),p_op:crypto.randomUUID(),p_action:action,p_node:nodeId,p_uid:inst?inst.uid:null},r=>{
            if(player!==who||currentSlot!==slot||!cloudUser||cloudUser.id!==uid)return;
            if(r.consumeId)consumeItem(r.consumeId,r.consumeN);
            if(r.removeUid)removeInst(r.removeUid);
            if(r.addItem&&!player.inv.some(it=>it.uid===r.addItem.uid))player.inv.push(r.addItem);
            player.talent=r.talent;clampHpMp();
        });
        if(player===who&&currentSlot===slot){talentPlanState=talentLivePlanState();talentPlanView.message='正式天賦已同步。';}
    }catch(e){talentPlanView.message=String(e.message||e);showToast(talentPlanView.message);}
    finally {talentLiveBusy=false;if(player===who&&currentSlot===slot)talentPlanRender();else talentClosePlanner();}
}
