// 武魂能力換算（effects／bonuses 給角色數值用）＋魂槽升階（2026-11-15 使用者設計：第 i 槽獻祭第 i 階武魂當門檻，不給能力；資料與規則在 tdj-systems.js）。
window.SoulRings=(()=>{
 const names={力量:'str',敏捷:'dex',體質:'con',精神:'wis',智力:'int',魅力:'cha',HP:'hp',MP:'mp',回血:'hpr',回魔:'mpr',近戰傷害:'melee',近距離傷害:'melee',遠攻傷害:'ranged',近戰命中:'meleeHit',近距離命中:'meleeHit',魔法命中:'magicHit',遠攻命中:'rangedHit',遠距傷害:'ranged',遠距命中:'rangedHit',魔攻:'sp',物理減免:'reduction',魔法減免:'magicReduction',火抗:'fire',水抗:'water',風抗:'wind',地抗:'earth','經驗%':'exp'};
 const labels=Object.fromEntries(Object.entries(names).map(([k,v])=>[v,k]));labels.exp='經驗';
 function effects(w,scale=1){const out={};for(const line of w?.fx||[]){const m=line.match(/^(.+?)\+([\d.]+)$/),key=m&&names[m[1]];if(!key)continue;const n=Number(m[2]);out[key]=(out[key]||0)+(scale===1?n:Math.max(1,Math.floor(n*scale)));}return out;}
 const TIERS=['下品','上品','極品','千年','萬年','上古','四神獸'];
 const state=()=>window.TdjSystems?.wuhun.ringState||{slots:Array(6).fill(null)};
 const soul=id=>wuhunData.find(w=>String(w.id)===String(id));
 function bonuses(){const active=window.TdjSystems?.wuhun.active,out=active?effects(soul(active)):{};const doll=window.DollEffects?.bonuses();if(doll)for(const [k,n]of Object.entries(doll))out[k]=(out[k]||0)+n;return out;} // 只算裝備中的武魂；魂槽祭品不給能力。2026-11-17：召喚中的魔法娃娃能力一起算（data/doll-effects.js）
 const ringBonuses=()=>({});
 const describe=bonus=>Object.entries(bonus).map(([k,n])=>(labels[k]||k)+'+'+n+(k==='exp'?'%':''));
 const need=id=>window.TdjSystems?.wuhun.ringMissing(id)||[];
 // 第 slot 槽可獻祭的武魂：該階、持有中（裝備中的那隻要留 1 隻）
 function candidates(slot){const tier=TIERS[slot],active=String(window.TdjSystems?.wuhun.active);return wuhunData.filter(w=>w.tier===tier).map(w=>({w,spare:(TdjSystems.wuhun.owned(w.id)||0)-(active===String(w.id)?1:0)})).filter(r=>r.spare>0);}
 return {TIERS,effects,bonuses,ringBonuses,describe,state,need,candidates,get:soul,offer:id=>TdjSystems.wuhun.changeRings('offer',Number(id)),fuse:t=>TdjSystems.wuhun.changeRings('fuse',Number(t)),place:slot=>TdjSystems.wuhun.changeRings('place',Number(slot))};
})();
