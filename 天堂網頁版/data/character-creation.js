let creationDraft=null;
const creationStatControls={},creationClassButtons=[];
function creationRemaining(){if(!creationDraft)return 0;return 75-CreationRules.keys.reduce((sum,k)=>sum+creationDraft.stats[k],0)}
function updateCreation(){
 if(!creationDraft)return;const c=CreationRules.classes[creationDraft.role],total=CreationRules.keys.reduce((s,k)=>s+creationDraft.stats[k],0);
 document.querySelector('#creation-class-title').textContent=creationDraft.role;document.querySelector('#creation-intro').textContent=c.intro;
 const img=document.querySelector('#creation-portrait'),art=c.art?.[creationDraft.gender];img.src='assets/entry/'+(art||c.portraits[creationDraft.gender]);img.classList.toggle('creation-art',!!art);
 document.querySelector('#creation-remaining').textContent=String(creationDraft.rolls);document.querySelector('#creation-total').textContent='能力合計 '+total+' / 75';
 for(const gender of [0,1])document.querySelector(gender?'#creation-female':'#creation-male').setAttribute('aria-pressed',String(creationDraft.gender===gender));
 for(const item of creationClassButtons)item.button.setAttribute('aria-pressed',String(item.role===creationDraft.role));
 for(const k of CreationRules.keys){const item=creationStatControls[k],value=creationDraft.stats[k];item.value.textContent=String(value);item.value.classList.toggle('rolled-max',value===20);item.base.textContent='初始 '+c.base[k]+' · 最高 20';}
 const v=CreationRules.vitals(creationDraft.role,creationDraft.stats);document.querySelector('#creation-vitals').textContent='初始生命 '+v.hp+'　初始魔力 '+v.mp;document.querySelector('#creation-submit').disabled=!CreationRules.validStats(creationDraft.role,creationDraft.stats);
}
function rollCreationStats(){if(!creationDraft)return false;creationDraft.stats=CreationRules.rollStats(creationDraft.role);creationDraft.rolls++;document.querySelector('#creation-message').textContent='已擲出新屬性，可重新擲骰或使用這組數值建立角色。';updateCreation();return true;}
function openCharacterCreation(slot){creationDraft={slot,role:'騎士',gender:0,stats:{},rolls:0};document.querySelector('#creation-name').value='';rollCreationStats();}
function selectCreationClass(role){if(!creationDraft||!CreationRules.classes[role])return false;if(creationDraft.role!==role){creationDraft.role=role;creationDraft.rolls=0;rollCreationStats();}else updateCreation();return true;}
function setCreationGender(gender){if(creationDraft){creationDraft.gender=gender===1?1:0;updateCreation();}}
function commitCharacterCreation(){if(!creationDraft)return false;return GameEntry.create({...creationDraft,name:(document.querySelector('#creation-name').value||'').trim(),stats:{...creationDraft.stats}});}
for(const role of CreationRules.jobs){const button=document.createElement('button');button.type='button';button.textContent=role;button.onclick=()=>selectCreationClass(role);creationClassButtons.push({role,button});document.querySelector('#creation-classes').append(button);}
for(const key of CreationRules.keys){const row=document.createElement('div'),label=document.createElement('div'),title=document.createElement('strong'),base=document.createElement('small'),value=document.createElement('output');row.className='creation-stat';title.textContent=CreationRules.labels[key]+' '+key.toUpperCase();label.append(title,base);value.setAttribute('aria-label',CreationRules.labels[key]+'擲骰結果');row.append(label,value);creationStatControls[key]={value,base};document.querySelector('#creation-stats').append(row);}
document.querySelector('#creation-male').onclick=()=>setCreationGender(0);document.querySelector('#creation-female').onclick=()=>setCreationGender(1);document.querySelector('#creation-reset').onclick=rollCreationStats;document.querySelector('#creation-back').onclick=()=>{creationDraft=null;setEntryScreen('selection');updateEntrySelection();};document.querySelector('#creation-form').addEventListener('submit',event=>{event.preventDefault();commitCharacterCreation();});
window.CharacterCreation={open:openCharacterCreation,selectClass:selectCreationClass,roll:rollCreationStats,reset:rollCreationStats,setGender:setCreationGender,commit:commitCharacterCreation,get draft(){return creationDraft?JSON.parse(JSON.stringify(creationDraft)):null;},get remaining(){return creationRemaining();}};
