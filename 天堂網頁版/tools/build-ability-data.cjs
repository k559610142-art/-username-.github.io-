const fs=require('fs'),path=require('path'),vm=require('vm'),root=path.resolve(__dirname,'..');
function table(file){let rows;vm.runInNewContext(fs.readFileSync(path.join(root,'data/database',file),'utf8'),{GameDatabase:{register:(name,cols,data)=>rows=data.map(r=>Object.fromEntries(cols.map((c,i)=>[c.name,r[i]])))}});return rows;}
const armor={};for(const r of table('table-001.js')){const a={earth:r.defense_earth||0,fire:r.defense_fire||0,water:r.defense_water||0,wind:r.defense_wind||0,critical:r.magic_critical||0};if(Object.values(a).some(Boolean))armor[r.item_id]=a;}
const skills=Object.fromEntries(table('table-138.js').map(r=>[r.skill_id,{attr:r.attr||0,type:r.type||0}]));
fs.writeFileSync(path.join(root,'data/player-ability-data.js'),'// Original armor elemental defenses / magic critical and skill attributes.\nwindow.PLAYER_ABILITY_DATA='+JSON.stringify({armor,skills})+';\n');
