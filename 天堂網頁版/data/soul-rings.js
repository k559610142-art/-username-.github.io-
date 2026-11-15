// Soul rings are made from duplicate souls, retaining one of every collected soul.
window.SoulRings=(()=>{
 const names={力量:'str',敏捷:'dex',體質:'con',精神:'wis',智力:'int',魅力:'cha',HP:'hp',MP:'mp',回血:'hpr',回魔:'mpr',近戰傷害:'melee',近距離傷害:'melee',遠攻傷害:'ranged',遠攻命中:'rangedHit',遠距傷害:'ranged',遠距命中:'rangedHit',魔攻:'sp',物理減免:'reduction',魔法減免:'magicReduction',火抗:'fire',水抗:'water',風抗:'wind',地抗:'earth','經驗%':'exp'};
 const labels=Object.fromEntries(Object.entries(names).map(([k,v])=>[v,k]));labels.exp='經驗';
 function effects(w,scale=1){const out={};for(const line of w?.fx||[]){const m=line.match(/^(.+?)\+([\d.]+)$/),key=m&&names[m[1]];if(!key)continue;const n=Number(m[2]);out[key]=(out[key]||0)+(scale===1?n:Math.max(1,Math.floor(n*scale)));}return out;}
 const byId=new Map(wuhunData.map(w=>[Number(w.id),{id:Number(w.id),name:w.name.replace('武魂','魂環'),tier:w.tier,bonus:effects(w,.2)}]));
 const state=()=>window.TdjSystems?.wuhun.ringState||{owned:{},slots:Array(6).fill(null)};
 function ringBonuses(){const out={};for(const id of state().slots)for(const [k,n]of Object.entries(byId.get(Number(id))?.bonus||{}))out[k]=(out[k]||0)+n;return out;}
 function bonuses(){const active=window.TdjSystems?.wuhun.active;if(!active)return {};const w=wuhunData.find(w=>String(w.id)===String(active)),out=effects(w);for(const [k,n]of Object.entries(ringBonuses()))out[k]=(out[k]||0)+n;return out;}
 const describe=bonus=>Object.entries(bonus).map(([k,n])=>(labels[k]||k)+'+'+n+(k==='exp'?'%':''));
 function inventory(){const s=state();return Object.entries(s.owned).map(([id,count])=>({...byId.get(Number(id)),count,available:count-s.slots.filter(v=>Number(v)===Number(id)).length})).filter(r=>r.id);}
 return {effects,bonuses,ringBonuses,describe,inventory,get:id=>byId.get(Number(id)),state,craft:id=>TdjSystems.wuhun.changeRings('craft',Number(id)),equip:(slot,id)=>TdjSystems.wuhun.changeRings('equip',Number(id),slot),remove:slot=>TdjSystems.wuhun.changeRings('remove',0,slot)};
})();
