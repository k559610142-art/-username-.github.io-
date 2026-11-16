// Read-only item descriptions, shared by crafting previews and future inventory UI.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ItemProperties=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 const TYPES={helm:'頭盔',armor:'盔甲',cloak:'斗篷',glove:'手套',boots:'靴子',shield:'盾牌',ring:'戒指',amulet:'項鍊',earring:'耳環',belt:'腰帶',talisman:'符石',runeword:'符石',sword:'單手劍',dagger:'匕首',tohandsword:'雙手劍',blunt:'鈍器',bow:'弓',staff:'法杖',spear:'矛',arrow:'箭矢',potion:'藥水',scroll:'卷軸',gem:'寶石',material:'材料',questitem:'任務／製作道具',spellbook:'技能書'};
 const ATTR={str:'力量',dex:'敏捷',con:'體質',int:'智力',wis:'精神',cha:'魅力',hp:'HP',mp:'MP'};
 const RULES={m_def:'魔法防禦 MR',add_sp:'魔攻 SP',add_hpr:'體力恢復',add_mpr:'魔力恢復',hitmodifier:'近距離命中',hit_modifier:'近距離命中',dmgmodifier:'近距離傷害',dmg_modifier:'近距離傷害',bow_hit_modifier:'遠距離命中',bow_dmg_modifier:'遠距離傷害',damage_reduction:'傷害減免',magic_critical:'魔法暴擊',add_exp:'經驗加成'};
 const sign=n=>n>0?'+'+n:String(n);
 function read(item,options={}){
  const out=[],add=(label,value)=>{if(value!==undefined&&value!==null&&value!=='')out.push({label,value:String(value)});},r=item.sourceRules||{},enchant=Number(options.enchant)||0;
  add('類型',TYPES[item.type]||({weapon:'武器',armor:'防具',etcitem:'道具'}[item.kind])||'道具');
  if(item.kind==='weapon'){add('傷害（小型／大型）',(item.damage||[0,0]).join('／'));add('持用方式',item.twoHand?'雙手':'單手');if(enchant)add('強化傷害',sign(enchant));}
  if(item.kind==='armor')add('防禦 AC',Number(item.ac||0)-enchant);
  if(enchant)add('強化等級','+'+enchant);
  for(const [key,label]of Object.entries(ATTR)){const n=Number(item.bonuses?.[key])||0;if(n)add(label,sign(n));}
  const seen=new Set();for(const [key,label]of Object.entries(RULES)){const n=Number(r[key])||0;if(n&&!seen.has(label)){add(label,sign(n));seen.add(label);}}
  const native=options.armorData||{},elements={earth:'地屬性防禦',fire:'火屬性防禦',water:'水屬性防禦',wind:'風屬性防禦'};
  for(const [key,label]of Object.entries(elements)){const n=Number(native[key]??r['defense_'+key])||0;if(n)add(label,sign(n));}
  for(const [key,label]of Object.entries({stun:'昏迷耐性',stone:'石化耐性',sleep:'睡眠耐性',freeze:'寒冰耐性',sustain:'支撐耐性',blind:'暗黑耐性'})){const n=Number(native.control?.[key]??r['regist_'+key])||0;if(n)add(label,sign(n));}
  if(Number(native.critical))add('魔法暴擊',sign(Number(native.critical))+'%');
  if(['weapon','armor'].includes(item.kind)&&Number.isFinite(Number(r.safenchant)))add('安定值',r.safenchant);
  if(item.allowed?.length&&['weapon','armor'].includes(item.kind))add('可用職業',item.allowed.join('／'));
  if(Number.isFinite(item.weight))add('重量',item.nativeDb?item.weight/1000:item.weight);
  for(const effect of options.effects||[])add('效果',effect);
  if(item.kind==='etcitem'&&!(options.effects?.length)){
   const h=options.rule?.handler||'',definition=options.handler;let m;
   if((m=h.match(/^event\.(S?)Exp(\d+)(?:\s+(\d+))?/))){const pct=item.name.match(/(\d+)%/),times=item.name.match(/(\d+(?:\.\d+)?)倍/),rate=pct?Number(pct[1])/100:times?Number(times[1]):Number(m[2])/10;add('經驗倍率',rate+' 倍');add('持續時間',(Number(m[3])||(m[1]?1800:600))+' 秒');}
   else if((m=h.match(/^hp\.UserAddHp\s+(\d+)\s+(\d+)/)))add('使用效果','回復 HP '+m[1]+'～'+m[2]);
   else if(definition?.kind==='hpGaussian')add('使用效果','回復 HP 約 '+definition.base+'（有浮動）');
   else if(item.type==='material'||item.type==='gem'||item.type==='questitem'||h==='0')add('用途','製作／任務材料；實際用途依配方而定');
   else add('使用說明','使用效果依道具規則；此處僅查看屬性');
  }
  return out;
 }
 return {read};
});
