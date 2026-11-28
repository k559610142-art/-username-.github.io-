// 初值、可配點數與生命／魔力計算取自使用者提供的伺服器。
// src/com/lineage/server/clientpackets/C_CreateChar.java:50-57
// src/com/lineage/server/utils/CalcInitHpMp.java
window.CreationRules=(()=>{
  const keys=['str','dex','con','wis','cha','int'],labels={str:'力量',dex:'敏捷',con:'體質',wis:'精神',cha:'魅力',int:'智力'};
  const classes={
    '騎士':{type:1,base:{str:16,dex:12,con:14,wis:9,cha:12,int:8},points:4,hp:16,portraits:['knight-m.png','knight-f.png'],intro:'站在戰鬥前線的近戰職業，以武器作戰與承受傷害為主。'},
    '法師':{type:3,base:{str:8,dex:7,con:12,wis:12,cha:8,int:12},points:16,hp:12,portraits:['mage-m.png','mage-f.png'],intro:'擅長魔法攻擊與輔助的施法職業，需留意魔力與自身生存。'},
    '王族':{type:0,base:{str:13,dex:10,con:10,wis:11,cha:13,int:10},points:8,hp:14,portraits:['royal-m.png','royal-f.png'],intro:'能夠領導血盟的職業，以領袖身分結合近戰能力與團隊支援。'},
    '妖精':{type:2,base:{str:11,dex:12,con:12,wis:12,cha:9,int:12},points:7,hp:15,portraits:['elf-m.png','elf-f.png'],intro:'兼具弓箭與精靈魔法的職業，可在遠距作戰與輔助之間選擇。'},
    '黑妖':{type:4,base:{str:12,dex:15,con:8,wis:10,cha:9,int:11},points:10,hp:12,portraits:['class-2786.png','class-2796.png'],art:['darkelf-art-m.jpg','darkelf-art-f.jpg'],intro:'擅長雙刀、鋼爪與黑暗精靈魔法的近戰職業，以迅捷身法與爆發攻擊作戰。'},
    // 2026-11-11: Server_Game_2.jar C_CreateChar ORIGINAL_* index 5／6／7 and CalcInitHpMp; portraits are the client sprite (tools/class-sprites).
    '龍騎士':{type:5,base:{str:13,dex:11,con:14,wis:12,cha:8,int:11},points:6,hp:16,portraits:['class-6658.png','class-6661.png'],art:['dragonknight-art-m.jpg','dragonknight-art-f.jpg'],intro:'繼承龍之力量的戰士，以鎖鏈劍、雙手劍近戰，兼具龍魔法。'},
    '幻術師':{type:6,base:{str:11,dex:10,con:12,wis:12,cha:8,int:12},points:10,hp:14,portraits:['class-6671.png','class-6650.png'],art:['illusionist-art-m.jpg','illusionist-art-f.jpg'],intro:'操控幻象的施法者，使用奇古獸與魔杖，兼顧攻擊與輔助。'},
    '戰士':{type:7,base:{str:16,dex:13,con:16,wis:7,cha:9,int:10},points:4,hp:16,portraits:['class-12490.png','class-12494.png'],art:['warrior-art-m.jpg','warrior-art-f.jpg'],intro:'以強健體魄揮舞斧、劍與長矛的近戰職業，擅長正面硬戰。'}
  };
  classes['油傘女']={
    type:8,gender:1,base:{str:11,dex:17,con:12,wis:10,cha:7,int:8},points:10,hp:14,
    portraits:['../transform-portraits/980001.png','../transform-portraits/980001.png'],
    selectionArt:'oil-parasol-selection.png',
    intro:'以油傘近身作戰。敏捷提升命中與傷害，張傘可吸收傷害。'
  };
  const validGender=(role,gender)=>(gender===0||gender===1)&&(classes[role]?.gender===undefined||gender===classes[role].gender);
  function canEquip(role,item){
    if(role!=='油傘女')return !!item?.allowed.includes(role);
    if(item?.kind==='weapon')return item.allowed.includes(role);
    return item?.kind==='armor'&&item.type!=='shield'&&item.type!=='guarder'&&item.allowed.length>=5;
  }
  const minStat=7,maxStat=20,totalStats=75;
  function hasTotal(stats){return !!stats&&keys.every(k=>Number.isInteger(stats[k]))&&keys.reduce((sum,k)=>sum+stats[k],0)===totalStats;}
  function validStats(role,stats){
    return Object.hasOwn(classes,role)&&hasTotal(stats)&&keys.every(k=>stats[k]>=minStat&&stats[k]<=maxStat);
  }
  function validStoredStats(role,stats){
    const c=Object.hasOwn(classes,role)?classes[role]:null;
    return validStats(role,stats)||!!c&&hasTotal(stats)&&keys.every(k=>stats[k]>=c.base[k]&&stats[k]<=c.base[k]+c.points);
  }
  const ways=Array.from({length:keys.length+1},()=>Array(totalStats+1).fill(0));
  ways[0][0]=1;
  for(let fields=1;fields<=keys.length;fields++){
    for(let sum=0;sum<=totalStats;sum++){
      for(let value=minStat;value<=Math.min(maxStat,sum);value++)ways[fields][sum]+=ways[fields-1][sum-value];
    }
  }
  function rollStats(role,rng=Math.random){
    if(!Object.hasOwn(classes,role))return null;
    const stats={};
    const roll=()=>Math.max(0,Math.min(1-Number.EPSILON,Number(rng())||0));
    let left=totalStats,fields=keys;
    if(role==='油傘女'){
      stats.dex=16+Math.floor(roll()*5);
      left-=stats.dex;
      fields=keys.filter(key=>key!=='dex');
    }
    let ticket=Math.floor(roll()*ways[fields.length][left]);
    for(const [index,key] of fields.entries()){
      const remaining=fields.length-1-index;
      for(let value=minStat;value<=Math.min(maxStat,left);value++){
        const count=ways[remaining][left-value];
        if(ticket<count){stats[key]=value;left-=value;break;}
        ticket-=count;
      }
    }
    return stats;
  }
  function vitals(role,stats){const c=classes[role],wis=stats.wis;let mp;
    if(role==='騎士')mp=[12,13].includes(wis)?2:1;
    else if(role==='王族')mp=wis>=12&&wis<=15?3:wis>=16&&wis<=18?4:2;
    else if(role==='黑妖')mp=wis>=16&&wis<=18?6:wis>=12&&wis<=15?4:3;
    else if(role==='妖精')mp=wis>=16&&wis<=18?6:4;
    else if(role==='龍騎士'||role==='幻術師')mp=wis>=16&&wis<=18?6:4;
    else if(role==='戰士')mp=1;
    else if(role==='油傘女')mp=5;
    else mp=wis>=16&&wis<=18?8:6;
    return {hp:c.hp,mp};
  }
  return {keys,labels,classes,jobs:Object.keys(classes),canEquip,validGender,validStats,validStoredStats,rollStats,vitals};
})();
