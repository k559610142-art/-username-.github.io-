// 依目前武器的 walk 動作取原始速度；無武器設定時使用空手 walk(0)。
function getActiveWalkProfile(){const role=typeof job==='string'?job:'騎士',gender=typeof characterGender==='number'?characterGender:0;const actions=(SPRITE_MOVEMENT.profiles[role+':'+gender]||SPRITE_MOVEMENT.profiles['騎士:0']).actions;return actions[typeof activeWeaponWalkAction==='function'?activeWeaponWalkAction():0]||actions[0]}
function getMovementStepMs(profile=getActiveWalkProfile(),modifiers=window.playerMovementModifiers||{}){let ms=profile.stepMs;for(const [key,factor] of [['haste',.755],['fastMovable',.665],['brave',.755],['braveX',.755],['elfBrave',.855]])if(modifiers[key])ms=Math.trunc(ms*factor);return Math.max(1,ms)}
window.MovementConfig=Object.freeze({get stepMs(){return getMovementStepMs()},pollMs:32,animationFrameMs:110});
let lastMovementAt=-Infinity,lastMovementDuration=0;
function movementTime(){return globalThis.performance?.now?.()??Date.now()}
function movementReady(now=movementTime()){return !movementAnimating(now)&&now-lastMovementAt>=lastMovementDuration}
function markMovementStep(now=movementTime(),duration=MovementConfig.stepMs){lastMovementAt=now;lastMovementDuration=duration}
function walkFrameIndex(elapsed,duration,count,profile=getActiveWalkProfile()){const phase=Math.max(0,Math.min(1-Number.EPSILON,elapsed/Math.max(1,duration))),tick=phase*profile.sourceTicks;let total=0,pose=profile.frames.length-1;for(let i=0;i<profile.frames.length;i++){total+=profile.frames[i].ticks;if(tick<total){pose=i;break}}const raw=profile.frames[pose].imageFrame,maxRaw=Math.max(...profile.frames.map(f=>f.imageFrame));if(count>maxRaw)return raw;if(count===profile.frames.length)return pose;return Math.min(count-1,Math.floor(phase*count))}
function resetMovementState(){movementTween=null;lastMovementAt=-Infinity;lastMovementDuration=0}
// 邏輯每個 walk 動作走一格，顯示座標在兩格之間連續內插。
let movementTween=null;
function visualWorldPosition(now=movementTime()){if(!movementTween||movementTween.toX!==worldX||movementTween.toY!==worldY)return {x:worldX,y:worldY};const t=Math.max(0,Math.min(1,(now-movementTween.started)/movementTween.duration));return {x:movementTween.fromX+(movementTween.toX-movementTween.fromX)*t,y:movementTween.fromY+(movementTween.toY-movementTween.fromY)*t}}
function startVisualStep(nextX,nextY,now=movementTime(),started=now){const current=visualWorldPosition(now),duration=MovementConfig.stepMs;worldX=nextX;worldY=nextY;movementTween={fromX:current.x,fromY:current.y,toX:nextX,toY:nextY,started,duration};markMovementStep(started,duration)}
function movementAnimating(now=movementTime()){return !!movementTween&&movementTween.toX===worldX&&movementTween.toY===worldY&&now-movementTween.started<movementTween.duration}
