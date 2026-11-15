const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../data',name),'utf8');
function fixture(){
  const layer=()=>({style:{},hidden:true,children:[]});
  const c={monsterActionIndex:{999:{'d5/idle':[['body.png',20,-80,40,80,100]],'d5/attack':[['attack.png',50,-70,100,70,100]]}},weaponMorphModes:{999:{4:'sword'}},weaponMorphFrames:{sword:{'d5/idle':[['sword.png',-100,-80,280,80,100]]}},deathKnightOriginalLayers:{},deathKnightLayers:{},Image:class{constructor(){this.complete=true;this.naturalWidth=256;}},characterActionState:null,characterDead:false,characterWalkUntil:0,characterHeading:'S',characterRenderScale:()=>2,walkPhase:()=>null,morphStarted:0,frameMs:130,morphLayer:layer(),morphBody:layer(),morphShadow:layer(),atlasBody:layer(),compositeLayers:{shadow:layer(),light:layer(),extras:layer()},activeTransformCard:{n:'測試變身',p:{gfx:999},f:{idle:1,attack:1}},OwnedInventory:{equippedWeaponType:'sword'}};
  c.window=c;vm.createContext(c);vm.runInContext(read('monster-actions.js')+';this.actions=MonsterActions;',c);
  const source=read('transform-cards.js');vm.runInContext(source.slice(source.indexOf('  let displayedNativeCard = null;'),source.indexOf('  const baseRefresh = refreshCharacter;'))+';this.draw=drawMorph;',c);
  return c;
}
test('變身本體腳底與人物原點重合，不受武器外框偏移影響',()=>{
  const c=fixture();c.draw(0);
  assert.equal(parseFloat(c.morphLayer.style.left)+parseFloat(c.atlasBody.style.left)+parseFloat(c.atlasBody.style.width)/2,0);
  // The weapon frame extends left of the resting body; the shared body anchor stays fixed.
  assert.deepEqual([...c.actions.groundAnchor(999,'S',4)],[40,0]);
  assert.equal(c.morphLayer.style.left,'-80px');
  assert.equal(c.morphLayer.style.top,'0px');
});
test('攻擊幀向前伸展時不重新以攻擊外框移動腳底錨點',()=>{
  const c=fixture();c.draw(0);const left=c.morphLayer.style.left;
  c.characterActionState={action:'attack',started:10,until:110,duration:100};c.draw(20);
  assert.equal(c.morphLayer.style.left,left);
  assert.equal(c.morphLayer.style.top,'0px');
});
test('方向或素材尚未載入時使用安全原點',()=>{
  const c=fixture();assert.deepEqual([...c.actions.groundAnchor(999,'N',4)],[0,0]);assert.deepEqual([...c.actions.groundAnchor(123,'S')],[0,0]);
});
