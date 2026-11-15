const fs=require('fs'),vm=require('vm'),path=require('path'),root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,'data',f),'utf8');
let rows;vm.runInNewContext(read('database/table-138.js'),{GameDatabase:{register:(n,cols,data)=>rows=data.map(r=>Object.fromEntries(cols.map((c,i)=>[c.name,r[i]])))}});
const byId=new Map(rows.map(r=>[r.skill_id,r])),c={nativeMonsterFiles:new Set()};c.window=c;vm.createContext(c);
for(const f of ['player-skill-data.js','island-monster-data.js','dungeon-monster-data.js'])vm.runInContext(read(f),c,{filename:f});
const skills=vm.runInContext('playerSkillData.skills',c),templates=vm.runInContext('islandMonsterTemplates',c),differences=[];
function check(id,s,monster=false){const r=byId.get(Number(id));if(!r){differences.push({id,missing:true});return;}const fields={name:r.name,mp:r.mpConsume,reuse:r.reuseDelay,duration:r.buffDuration,range:r.ranged,gfx:r.castgfx,target:r.target,damage:[r.damage_value,r.damage_dice,r.damage_dice_count]};if(monster){fields.action=r.action_id;fields.gfx2=r.castgfx2;}else fields.hp=r.hpConsume;for(const [field,value]of Object.entries(fields))if(JSON.stringify(s[field])!==JSON.stringify(value))differences.push({id,monster,field,web:s[field],source:value});}
for(const [id,s]of Object.entries(skills))check(id,s);
const spells=[...new Map(Object.values(templates).flatMap(n=>n.skills||[]).filter(s=>s.spell).map(s=>[s.id,s])).values()];
for(const s of spells)check(s.id,s.spell,true);
const unsupported=spells.filter(s=>s.type===2&&!s.spell.damage.some(Boolean)&&![11,29,33,76].includes(s.id)).map(s=>({id:s.id,name:s.spell.name}));
const report={playerSkills:Object.keys(skills).length,monsterSpells:spells.length,differences,unsupportedMonsterEffects:unsupported,mummy:{skillId:33,databaseDurationSeconds:byId.get(33).buffDuration,coreDelayMs:5000,corePetrifyMs:4000,coreEvidence:'Server_Game_2.jar: skillmode/CURSE_PARALYZE.start -> L1CurseParalysis.curse(target,5000,4000,1)',holySkillId:37,holySkillName:byId.get(37).name,antidoteSkillId:9,webExtraProtectionMs:8000}};
fs.writeFileSync(path.join(root,'技能來源比對.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({playerSkills:report.playerSkills,monsterSpells:report.monsterSpells,differences:differences.length,unsupportedMonsterEffects:unsupported.length}));
if(differences.length)process.exitCode=1;
