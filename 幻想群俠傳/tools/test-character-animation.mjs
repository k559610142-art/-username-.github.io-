import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={Game:{}};vm.createContext(context);
const run=file=>vm.runInContext(fs.readFileSync(file,'utf8'),context);
run('data/characters.js');
for(const id of ['s','sw','w','nw','n','ne','e','se'])run(`data/walk-frames/${id}.js`);
run('data/character-renderer.js');run('data/movement.js');
const character=context.Game.characters.swordsman,walk=character.walk;
assert.equal(walk.directions.length,8);
assert.equal(new Set(walk.directions.map(d=>d.id)).size,8);
assert.equal(new Set(walk.poseTimeline).size,8);
for(let facing=0;facing<8;facing++){
  const direction=walk.directions[facing],clip=walk.clips[direction.id];
  const png=fs.readFileSync(clip.image),width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  assert.equal(clip.frames.length,8);assert.equal(clip.pivots.length,8);
  for(const frame of clip.frames){assert(frame.w>0&&frame.h>0);assert(frame.x>=0&&frame.y>=0&&frame.x+frame.w<=width&&frame.y+frame.h<=height);}
  for(let phase=0;phase<16;phase++){
    const calls=[];
    const ctx={save(){},restore(){},drawImage(...args){calls.push(args);},scale(){throw Error('Unexpected mirrored direction');}};
    context.Game.drawCharacter(ctx,{facing,moving:true,phase},{[direction.id]:{}},character);
    assert.equal(calls.length,1);
    const source=clip.frames[walk.poseTimeline[phase]];
    assert.equal(calls[0][1],source.x);assert.equal(calls[0][2],source.y);assert.equal(calls[0][4],source.h);
  }
}
const timing=walk.timing,ms=timing.frameCount*timing.baseTickMs*timing.referenceRate/timing.frameRate;
assert.equal(ms,640);
const movement=context.Game.createMovement({tileSize:32,isBlocked:()=>false},{x:0,y:0});
movement.go(1,0);
for(let i=0;i<64;i++)movement.update(.01);
assert.equal(movement.state.x,1);assert(Math.abs(movement.state.phase-16)<1e-8);
console.log('PASS: 8 independent assets, 64 source frames, 128 render samples without mirroring, source bounds, 640ms movement/cycle sync');
