// 公會地區探索：正式編隊、獨立圖層／圖塊、只在本次出發保留位置，不發獎。
const GUILD_MAP_STARTS = ['harbor', 'foothills', 'port'];
const GUILD_MAP_DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const GUILD_MAP_MODELS = { sentinel:'bulwark', warrior:'war', ranger:'wild', arcanist:'arcane', healer:'wish' };
const GUILD_MAP_TILES = new Map(Object.values(GUILD_MAP_DEFS).flatMap(m => m.layers.flatMap(l => l.tiles.map(t => [t.src,t]))));
let guildTrip = null;

function guildMapDecode(runs, length) {
    const out = new Uint8Array(length); let at = 0;
    if (!Array.isArray(runs) || runs.length % 2) throw Error('invalid_map_runs');
    for (let i=0;i<runs.length;i+=2) {
        const v=runs[i], n=runs[i+1];
        if (!Number.isInteger(v)||v<0||v>255||!Number.isInteger(n)||n<1||at+n>length) throw Error('invalid_map_runs');
        out.fill(v,at,at+n); at+=n;
    }
    if (at!==length) throw Error('invalid_map_runs');
    return out;
}
function guildMapAlive(trip) {
    return guildTrip===trip && player===trip.subject && guildOwner()===trip.owner && inTown()
        && player.created===trip.created && player.cls===trip.cls && player.guild && (!player.guild.activeTicket||trip.mission&&player.guild.activeTicket.ticket.ticketId===trip.mission.ticket.ticketId)
        && Array.isArray(player.guild.squad) && player.guild.squad.join('|')===trip.squad.join('|')
        && Array.isArray(player.guild.members) && trip.squad.every(id=>player.guild.members.some(m=>m.id===id&&m.restUntil<=Date.now()));
}
function guildMapLoader(trip) {
    let active=0; const queue=[];
    trip.abort.signal.addEventListener('abort',()=>{for(const job of queue.splice(0))job.reject(Error('map_cancelled'));});
    function drain() {
        while(active<3&&queue.length) {
            const job=queue.shift();
            if(trip.abort.signal.aborted){job.reject(Error('map_cancelled'));continue;}
            active++;trip.metrics.maxLoads=Math.max(trip.metrics.maxLoads,active);
            (async()=>{
                const meta=GUILD_MAP_TILES.get(job.key);
                if(!meta)throw Error('invalid_map_asset');
                const response=await fetch(job.key+'?v='+encodeURIComponent(GAME_VERSION),{signal:trip.abort.signal});
                if(!response.ok)throw Error('map_asset_unavailable');
                const blob=await response.blob(); let image;
                if(typeof createImageBitmap==='function')image=await createImageBitmap(blob);
                else image=await new Promise((resolve,reject)=>{const im=new Image(),url=URL.createObjectURL(blob);im.onload=()=>{URL.revokeObjectURL(url);resolve(im);};im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('map_asset_decode'));};im.src=url;});
                const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
                if(trip.abort.signal.aborted||width!==meta.texW||height!==meta.texH){if(image.close)image.close();throw Error('map_asset_decode');}
                trip.metrics.loaded++;
                return {value:image,bytes:width*height*4,dispose:()=>{if(image.close)image.close();else image.src='';trip.metrics.disposed++;}};
            })().then(job.resolve,job.reject).finally(()=>{active--;drain();});
        }
    }
    return key=>new Promise((resolve,reject)=>{queue.push({key,resolve,reject});drain();});
}
function guildMapWorld(def) {
    const width=def.width/def.cell,height=def.height/def.cell,size=width*height;
    const world=new GuildWorld(width,height,guildMapDecode(def.walkRuns,size)),edges=guildMapDecode(def.edgeRuns,size);
    world.neighbors=function(x,y){const flags=edges[y*width+x],out=[];for(let i=0;i<8;i++)if(flags&(1<<i))out.push([x+GUILD_MAP_DIRS[i][0],y+GUILD_MAP_DIRS[i][1]]);return out;};
    world.raw=guildMapDecode(def.rawRuns,size);world.edges=edges;
    return world;
}
function guildMapNearest(world, px, py) {
    const x=Math.floor(px/4),y=Math.floor(py/4);if(world.canStand(x,y))return [x,y];
    let best=null,distance=Infinity;
    for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(world.canStand(x+dx,y+dy)&&dx*dx+dy*dy<distance){best=[x+dx,y+dy];distance=dx*dx+dy*dy;}
    return best;
}
function guildMapMakeState(trip, id, entry) {
    const def=GUILD_MAP_DEFS[id];if(!def||!Object.prototype.hasOwnProperty.call(def.entries,entry))throw Error('invalid_map_entry');
    const world=guildMapWorld(def),target=guildMapNearest(world,...def.entries[entry]);
    let from=guildMapNearest(world,...def.center),path=target&&from&&world.path(from,target);
    if(!path)throw Error('map_entry_blocked');
    if(path.length<40){for(let i=0;i<world.mask.length;i++)if(world.mask[i]&&Math.hypot(i%world.width-target[0],Math.floor(i/world.width)-target[1])>50){from=[i%world.width,Math.floor(i/world.width)];path=world.path(from,target);break;}}
    if(!path)throw Error('map_entry_blocked');
    const trail=[from,...path].slice(-64),hero={id:'player',label:trip.subject.name},actors=[hero,...trip.squad.map(id=>({id,label:GuildCore.MEMBERS[id].name}))];
    actors.forEach((actor,i)=>{const p=trail[Math.max(0,trail.length-1-(i?9+(i-1)*10:0))];Object.assign(actor,{x:p[0],y:p[1],px:p[0],py:p[1],dir:'down',picture:document.createElement('canvas')});});
    return {def,world,actors,hero,trail,route:[],resources:new Map(),streaming:false,loadFailed:false,acc:0,camera:{x:hero.x*4+2,y:hero.y*4+2},zoom:1};
}
function guildMapRelease(trip, state) { if(state){for(const resource of state.resources.values())resource.release();state.resources.clear();for(const actor of state.actors){actor.picture.width=1;actor.picture.height=1;}}trip.cache.clearUnused(); }
function guildMapCamera(trip,state) {
    const cv=trip.canvas,w=cv.clientWidth,h=cv.clientHeight,z=state.zoom,ex=Math.min(state.def.width/2,w/z/2),ey=Math.min(state.def.height/2,h/z/2);
    state.camera.x=Math.max(ex,Math.min(state.def.width-ex,state.hero.x*4+2));state.camera.y=Math.max(ey,Math.min(state.def.height-ey,state.hero.y*4+2));
    return {x:Math.max(0,Math.floor(state.camera.x-w/z/2)),y:Math.max(0,Math.floor(state.camera.y-h/z/2)),right:Math.min(state.def.width,Math.ceil(state.camera.x+w/z/2)),bottom:Math.min(state.def.height,Math.ceil(state.camera.y+h/z/2))};
}
function guildMapVisible(trip,state) {
    const rect=guildMapCamera(trip,state),margin=96;
    return state.def.layers.flatMap(l=>l.tiles).filter(t=>t.x+t.w>=rect.x-margin&&t.x<=rect.right+margin&&t.y+t.h>=rect.y-margin&&t.y<=rect.bottom+margin);
}
async function guildMapStream(trip,state) {
    if(state.streaming||state.loadFailed)return false;
    const visible=guildMapVisible(trip,state),missing=visible.filter(t=>!state.resources.has(t.src));
    if(!missing.length)return true;
    state.streaming=true;
    const result=await Promise.allSettled(missing.map(async t=>({key:t.src,resource:await trip.cache.acquire(t.src)})));
    const acquired=result.filter(r=>r.status==='fulfilled').map(r=>r.value);
    if(!guildMapAlive(trip)||trip.pending!==state&&trip.state!==state){for(const item of acquired)item.resource.release();trip.cache.clearUnused();state.streaming=false;return false;}
    for(const item of acquired)state.resources.set(item.key,item.resource);
    state.streaming=false;
    if(result.some(r=>r.status==='rejected')){state.loadFailed=true;trip.message='地圖載入失敗，請重試或返回公會。';return false;}
    const wanted=new Set(visible.map(t=>t.src));
    for(const [key,resource]of state.resources)if(!wanted.has(key)){resource.release();state.resources.delete(key);}
    trip.cache.clearUnused();return true;
}
async function guildMapChange(trip,id,entry) {
    if(!guildMapAlive(trip)||trip.loading)return false;
    trip.loading=true;trip.message='正在前往目的地…';let next;
    try {
        next=guildMapMakeState(trip,id,entry);trip.pending=next;
        if(!await guildMapStream(trip,next))throw Error('map_load_failed');
        if(!guildMapAlive(trip)||trip.pending!==next){guildMapRelease(trip,next);return false;}
        const previous=trip.state;trip.state=next;trip.pending=null;guildMapRelease(trip,previous);trip.message='已抵達'+next.def.name;guildMapGates(trip);if(trip.mission)guildMissionBind(trip);return true;
    } catch(error) {
        if(next)guildMapRelease(trip,next);
        if(guildMapAlive(trip)){trip.pending=null;trip.message='無法載入目的地。可重試，或返回公會。';}
        return false;
    } finally {if(guildTrip===trip)trip.loading=false;}
}
function guildMapMove(trip,px,py) {
    const state=trip.state;if(!guildMapAlive(trip)||!state||trip.loading||state.streaming||state.loadFailed)return false;
    const x=Math.floor(px/4),y=Math.floor(py/4);
    if(x<0||y<0||x>=state.world.width||y>=state.world.height||!state.world.raw[y*state.world.width+x]){if(trip.mission)guildMissionCommand(trip,'stop');state.route=[];trip.message='這裡無法通行，請走道路、橋面或碼頭。';return false;}
    const target=guildMapNearest(state.world,px,py),route=target&&state.world.path([state.hero.x,state.hero.y],target);
    if(trip.mission)return !!target&&guildMissionCommand(trip,'move',target);
    if(!route){state.route=[];trip.message='前方沒有安全通路。';return false;}
    state.route=route;trip.message=route.length?'沿路前進中':'已抵達';return true;
}
function guildMapStep(trip) {
    const s=trip.state;if(!s||!s.route.length)return;
    const next=s.route[0],dx=next[0]-s.hero.x,dy=next[1]-s.hero.y,dir=GUILD_MAP_DIRS.findIndex(d=>d[0]===dx&&d[1]===dy);
    if(dir<0||!(s.world.edges[s.hero.y*s.world.width+s.hero.x]&(1<<dir))){s.route=[];trip.message='前方通路不足，已停止。';return;}
    for(const actor of s.actors){actor.px=actor.x;actor.py=actor.y;}
    s.hero.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';s.world.move(s.hero,next);s.route.shift();s.trail.push(next);if(s.trail.length>64)s.trail.shift();
    s.actors.slice(1).forEach((actor,i)=>{const p=s.trail[Math.max(0,s.trail.length-10-i*10)],ax=p[0]-actor.x,ay=p[1]-actor.y;actor.dir=Math.abs(ax)>Math.abs(ay)?ax>0?'right':'left':ay>0?'down':'up';actor.x=p[0];actor.y=p[1];});
    if(!s.route.length){for(const actor of s.actors){actor.px=actor.x;actor.py=actor.y;}trip.message='已抵達';}
}
function guildMapGateNear(state,gate) {return !state.route.length&&Math.hypot(state.hero.x*4+2-gate.at[0],state.hero.y*4+2-gate.at[1])<=32;}
function guildMapGates(trip) {
    const host=trip.root.querySelector('[data-guild-gates]');host.replaceChildren();
    trip.state.def.gates.forEach((gate,i)=>{const button=document.createElement('button');button.textContent=gate.label;button.dataset.gate=String(i);button.disabled=true;button.addEventListener('click',()=>guildMapTravel(i));host.appendChild(button);});
}
function guildMapTravel(index) {
    const trip=guildTrip,state=trip&&trip.state,gate=state&&state.def.gates[index];
    if(!trip||!guildMapAlive(trip)||trip.loading||state.streaming||state.loadFailed||!gate||!guildMapGateNear(state,gate)||!GUILD_MAP_DEFS[gate.to])return Promise.resolve(false);
    if(trip.mission)return guildMissionTravel(trip,index);
    return guildMapChange(trip,gate.to,gate.entry);
}
function guildMapSprite(actor) {
    if(actor.vehicle)return {charH:64,drawH:46,walk:{cellW:64,cellH:64,frames:{down:1,right:1,up:1},ms:130}};
    if(actor.skin==='spider')return {charH:45,drawH:actor.boss?72:48,foot:[31,45],walk:{src:'images/monsters/giantSpider.png',cellW:62,cellH:49,frames:{down:1,right:1,up:1},ms:160},attack:{src:'images/monsters/giantSpider.png',cellW:62,cellH:49,rowOffset:3,frames:{down:1,right:1,up:1},ms:130}};
    if(actor.skin){const key={spider:'quest-spider-queen',bandit:'quest-bandit-ironhand',undead:'quest-lich-king',dragon:'valakas'}[actor.skin],q=SCENE_QUEST_SPRITES[key]||SCENE_QUEST_SPRITES.valakas;return {charH:q.body,drawH:actor.boss?Math.min(104,q.size):48,foot:q.foot,walk:{src:q.src,cellW:q.cw,cellH:q.ch,frames:{down:q.n[0],right:q.n[1],up:q.n[2]},ms:160},attack:{src:q.src,cellW:q.cw,cellH:q.ch,rowOffset:3,frames:{down:q.n[3],right:q.n[4],up:q.n[5]},ms:130}};}

    if(actor.id==='giant'||actor.id.startsWith('beast'))return {charH:224,foot:[96,210],drawH:actor.id==='giant'?90:62,walk:{src:'images/monsters/rework/mon-beast.png',cellW:192,cellH:224,frames:{down:2,right:2,up:2},ms:250}};
    if(actor.id.startsWith('miner'))return MERC_MODELS.bulwark;
    if(actor.id==='player')return playerSprite();
    if(actor.id==='scout')return {charH:160,drawH:46,foot:[192,282],walk:{src:'images/sprites/guild/scout-v1/walk.png',cellW:384,cellH:320,frames:{down:4,right:4,up:4},ms:130}};
    return MERC_MODELS[GUILD_MAP_MODELS[actor.id]];
}
function guildMapActor(trip,s,actor,f) {
    const sp=guildMapSprite(actor),anim=sp&&(trip.mission&&actor.attackUntil>trip.mission.core.tick&&sp.attack?sp.attack:sp.walk);if(!anim)return null;
    const image=anim.src?spriteImage(anim.src):null,k=sp.drawH/sp.charH,dw=anim.cellW*k,dh=anim.cellH*k,canvas=actor.picture;
    const w=Math.max(128,Math.ceil(dw+12)),h=Math.max(128,Math.ceil(dh+24));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const g=canvas.getContext('2d'),cx=w/2,cy=h-12,x=(actor.px+(actor.x-actor.px)*f)*4+2,y=(actor.py+(actor.y-actor.py)*f)*4+2;
    g.clearRect(0,0,w,h);g.fillStyle='#0006';g.beginPath();g.ellipse(cx,cy,10,6,0,0,Math.PI*2);g.fill();
    if(actor.vehicle){g.fillStyle='#3c2418';g.fillRect(cx-21,cy-18,42,9);g.fillStyle='#8e653c';g.fillRect(cx-18,cy-32,36,19);g.fillStyle='#71c9e3';g.beginPath();g.moveTo(cx-12,cy-32);g.lineTo(cx-4,cy-47);g.lineTo(cx+3,cy-34);g.lineTo(cx+11,cy-43);g.lineTo(cx+16,cy-30);g.closePath();g.fill();g.fillStyle='#201b18';for(const dx of [-17,17]){g.beginPath();g.arc(cx+dx,cy-7,7,0,Math.PI*2);g.fill();}}
    if(image){const dir=actor.dir==='left'?'right':actor.dir,row=actor.skin?{down:0,right:1,up:2}[dir]+(anim.rowOffset||0):actor.id==='giant'||actor.id.startsWith('beast')?0:{down:0,right:1,up:2}[dir],n=anim.frames[dir],frame=s.route.length||actor.x!==actor.px||actor.y!==actor.py||trip.mission&&actor.attackUntil>trip.mission.core.tick?Math.floor(gameNow/anim.ms)%n:Math.floor(n/2),foot=sp.foot||[anim.cellW/2,anim.cellH];g.save();if(actor.hp===0)g.globalAlpha=.35;g.translate(cx,cy);if(actor.dir==='left')g.scale(-1,1);g.drawImage(image,frame*anim.cellW,row*anim.cellH,anim.cellW,anim.cellH,-foot[0]*k,-foot[1]*k,dw,dh);g.restore();}
    // 只裁去這名角色被前景遮住的像素，不重畫地面，也不抹掉其他角色。
    g.globalCompositeOperation='destination-out';
    for(const layer of s.def.layers){if(!layer.depthLine)continue;const a=layer.depthLine,t=Math.max(0,Math.min(1,(x-a[0])/(a[2]-a[0]))),depth=a[1]+(a[3]-a[1])*t;if(y>=depth)continue;
        for(const tile of layer.tiles){if(tile.x+tile.w<x-w/2||tile.x>x+w/2||tile.y+tile.h<y-h||tile.y>y+12)continue;const r=s.resources.get(tile.src);if(r)g.drawImage(r.value,tile.sx,tile.sy,tile.w,tile.h,cx+tile.x-x,cy+tile.y-y,tile.w,tile.h);}}
    g.globalCompositeOperation='source-over';return {canvas,x,y,cx,cy,label:actor.label,height:sp.drawH};
}
function guildMapDraw(trip) {
    const s=trip.state,g=trip.canvas.getContext('2d'),w=trip.canvas.clientWidth,h=trip.canvas.clientHeight,d=Math.min(2,window.devicePixelRatio||1);
    if(trip.canvas.width!==Math.round(w*d)||trip.canvas.height!==Math.round(h*d)){trip.canvas.width=Math.round(w*d);trip.canvas.height=Math.round(h*d);}
    g.setTransform(d,0,0,d,0,0);g.fillStyle='#121d18';g.fillRect(0,0,w,h);
    trip.root.querySelector('[data-guild-map-status]').textContent=trip.loading||s&&s.streaming?'載入附近地圖中…':trip.message;
    trip.root.querySelector('[data-guild-retry]').hidden=!(s&&s.loadFailed||!s&&!trip.loading);if(!s)return;
    const rect=guildMapCamera(trip,s),bw=rect.right-rect.x,bh=rect.bottom-rect.y,buffer=trip.buffer;
    if(buffer.width!==bw||buffer.height!==bh){buffer.width=bw;buffer.height=bh;}
    const bg=buffer.getContext('2d');bg.clearRect(0,0,bw,bh);bg.imageSmoothingEnabled=false;
    for(const layer of s.def.layers)for(const tile of layer.tiles){if(tile.x+tile.w<rect.x||tile.x>rect.right||tile.y+tile.h<rect.y||tile.y>rect.bottom)continue;const r=s.resources.get(tile.src);if(r)bg.drawImage(r.value,tile.sx,tile.sy,tile.w,tile.h,tile.x-rect.x,tile.y-rect.y,tile.w,tile.h);}
    const z=s.zoom,screen=(x,y)=>[(x-s.camera.x)*z+w/2,(y-s.camera.y)*z+h/2],origin=screen(rect.x,rect.y);g.imageSmoothingEnabled=true;g.drawImage(buffer,origin[0],origin[1],bw*z,bh*z);
    if(s.route.length){g.strokeStyle='#dac78a';g.lineWidth=1.5;g.beginPath();for(const [i,p]of s.route.entries()){const at=screen(p[0]*4+2,p[1]*4+2);if(i)g.lineTo(...at);else g.moveTo(...at);}g.stroke();}
    const f=s.route.length?Math.min(1,s.acc/(trip.mission?100:40)):1,actors=s.actors.slice().sort((a,b)=>a.y-b.y).map(a=>guildMapActor(trip,s,a,f)).filter(Boolean);
    for(const actor of actors){const at=screen(actor.x,actor.y);g.drawImage(actor.canvas,at[0]-actor.cx*z,at[1]-actor.cy*z,actor.canvas.width*z,actor.canvas.height*z);}
    for(const actor of actors){const at=screen(actor.x,actor.y-actor.height-8);g.font='12px system-ui';g.textAlign='center';const size=Math.max(36,g.measureText(actor.label).width+12);g.fillStyle='#14231ee6';g.fillRect(at[0]-size/2,at[1]-13,size,18);g.fillStyle='#f4ddb0';g.fillText(actor.label,at[0],at[1]);}
    trip.root.querySelector('[data-guild-map-name]').textContent=s.def.region+' · '+s.def.name;
    trip.root.querySelector('[data-guild-map-status]').textContent=trip.loading||s.streaming?'載入附近地圖中…':trip.message;
    trip.root.querySelector('[data-guild-retry]').hidden=!(s.loadFailed||!trip.state&&!trip.loading);
    for(const button of trip.root.querySelectorAll('[data-gate]'))button.disabled=trip.loading||s.streaming||s.loadFailed||!guildMapGateNear(s,s.def.gates[Number(button.dataset.gate)]);
    if(trip.mission)guildMissionDraw(trip,g,screen);
}
function guildMapFrame(trip) {
    if(!guildMapAlive(trip)){if(guildTrip===trip)guildMapExit();return;}
    const delta=Math.max(0,Math.min(trip.mission?200:80,gameNow-trip.lastTime));trip.lastTime=gameNow;
    const s=trip.state;
    if(s&&!trip.loading&&!document.hidden){
        const missing=guildMapVisible(trip,s).some(t=>!s.resources.has(t.src));if(missing&&!s.streaming&&!s.loadFailed)guildMapStream(trip,s);
        if(!missing&&!s.streaming&&!s.loadFailed){if(trip.held&&!s.route.length)trip.manual(...trip.held);if(trip.mission)guildMissionTick(trip,delta);else{s.acc+=delta;while(s.acc>=40){s.acc-=40;guildMapStep(trip);}}}
    }
    guildMapDraw(trip);trip.frame=requestAnimationFrame(()=>guildMapFrame(trip));
}
async function guildDepart(id,mission=null) {
    if(!mission&&guildMissionBusy)return false;
    if(guildTrip||(!GUILD_MAP_STARTS.includes(id)&&!(mission&&GuildMissions.defs[mission.ticket.missionId].maps.includes(id)))||!player||!inTown())return false;
    const g=guildCurrent();if(!g||g.activeTicket&&(!mission||g.activeTicket.ticket.ticketId!==mission.ticket.ticketId)){showToast('請先處理進行中的公會任務');return false;}
    if(guildDraft(g).join('|')!==g.squad.join('|')){showToast('請先保存編隊再出發');return false;}
    const selected=GuildCore.select(mission?{...g,activeTicket:null}:g,g.squad,Date.now());
    if(!selected.ok){showToast('請選派三名不同且不在療養中的夥伴');return false;}
    const trip={subject:player,created:player.created,cls:player.cls,owner:guildOwner(),squad:g.squad.slice(),mission,abort:new AbortController(),state:null,pending:null,loading:false,lastTime:gameNow,frame:0,message:'準備出發…',metrics:{maxLoads:0,loaded:0,disposed:0}};
    guildTrip=trip;trip.cache=new GuildAssetCache(guildMapLoader(trip),24*1024*1024,96);
    trip.root=document.createElement('div');trip.root.className='guild-map-overlay';trip.root.setAttribute('role','dialog');trip.root.setAttribute('aria-modal','true');trip.root.setAttribute('aria-labelledby','guild-map-heading');
    trip.root.innerHTML='<div class="guild-map-shell"><header><div><small>傭兵公會 · 地區探索</small><h2 id="guild-map-heading" data-guild-map-name>準備出發</h2></div><button data-guild-exit>返回公會</button></header><div class="guild-map-layout"><div class="guild-map-stage"><canvas tabindex="0" aria-label="公會地區探索地圖"></canvas><div class="guild-map-message" data-guild-map-status>準備出發…</div><div class="guild-map-pad"><button data-direction="0,-1" aria-label="向上">↑</button><button data-direction="-1,0" aria-label="向左">←</button><button data-direction="0,1" aria-label="向下">↓</button><button data-direction="1,0" aria-label="向右">→</button></div></div><aside><b>探索隊伍</b><p data-guild-party></p><label>視野 <select data-guild-zoom><option value="1">正常</option><option value="0.7">廣角</option><option value="1.35">近看</option></select></label><p>點地面或使用方向鍵／WASD，自行走到道路或碼頭附近，再選擇前往地區。</p><div data-guild-gates></div><button data-guild-stop>停止移動</button><button data-guild-retry hidden>重試載入</button><p class="muted">地區探索不發任務獎勵；返回後回到原村莊，本次探索位置不保存。</p></aside></div></div>';
    trip.canvas=trip.root.querySelector('canvas');trip.buffer=document.createElement('canvas');document.body.appendChild(trip.root);
    trip.root.querySelector('[data-guild-party]').textContent=trip.subject.name+'、'+trip.squad.map(id=>GuildCore.MEMBERS[id].name).join('、');
    trip.root.querySelector('[data-guild-exit]').addEventListener('click',guildMapExit);
    trip.root.querySelector('[data-guild-stop]').addEventListener('click',()=>{trip.held=null;if(trip.mission)guildMissionCommand(trip,'stop');else if(trip.state)trip.state.route=[];trip.message='已停止';});
    trip.root.querySelector('[data-guild-zoom]').addEventListener('change',e=>{if(trip.state)trip.state.zoom=Number(e.target.value);});
    trip.root.querySelector('[data-guild-retry]').addEventListener('click',()=>{if(trip.state){trip.state.loadFailed=false;guildMapStream(trip,trip.state);}else guildMapChange(trip,id,'start');});
    trip.canvas.addEventListener('pointerdown',event=>{if(trip.mission&&guildMissionPointer(trip,event))return;const s=trip.state;if(!s)return;const box=trip.canvas.getBoundingClientRect();guildMapMove(trip,(event.clientX-box.left-box.width/2)/s.zoom+s.camera.x,(event.clientY-box.top-box.height/2)/s.zoom+s.camera.y);});
    trip.manual=(dx,dy)=>{const s=trip.state;if(s)guildMapMove(trip,(s.hero.x+dx)*4+2,(s.hero.y+dy)*4+2);};
    for(const button of trip.root.querySelectorAll('[data-direction]')){button.addEventListener('click',()=>{if(trip.skipPadClick){trip.skipPadClick=false;return;}trip.manual(...button.dataset.direction.split(',').map(Number));});button.addEventListener('pointerdown',event=>{event.preventDefault();trip.held=button.dataset.direction.split(',').map(Number);if(button.setPointerCapture)button.setPointerCapture(event.pointerId);});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>{trip.held=null;trip.skipPadClick=true;});}
    trip.key=event=>{if(guildTrip!==trip||event.ctrlKey||event.metaKey||event.altKey)return;if(event.key==='Tab'){const focusable=[...trip.root.querySelectorAll('button,select,canvas')].filter(e=>!e.disabled&&!e.hidden),at=focusable.indexOf(document.activeElement);if(at<0){event.preventDefault();focusable[0].focus();}else if(event.shiftKey&&at===0){event.preventDefault();focusable[focusable.length-1].focus();}else if(!event.shiftKey&&at===focusable.length-1){event.preventDefault();focusable[0].focus();}return;}if(event.target&&['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;event.stopImmediatePropagation();event.preventDefault();if(event.key==='Escape'){guildMapExit();return;}const dir={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[event.key.length===1?event.key.toLowerCase():event.key];if(dir)trip.manual(...dir);};
    document.addEventListener('keydown',trip.key,true);if(typeof sceneKeys!=='undefined')sceneKeys.length=0;
    trip.blur=()=>{trip.held=null;};trip.visibility=()=>{if(document.hidden)trip.held=null;};window.addEventListener('blur',trip.blur);document.addEventListener('visibilitychange',trip.visibility);
    trip.frame=requestAnimationFrame(()=>guildMapFrame(trip));trip.canvas.focus();
    let result=await guildMapChange(trip,id,'start');if(result&&mission){if(mission.core.map!==id)result=await guildMapChange(trip,mission.core.map,'start');if(result)guildMissionAttach(trip);}if(!guildMapAlive(trip)&&guildTrip===trip)guildMapExit();return result;
}
function guildMapExit() {
    const trip=guildTrip;if(!trip)return;if(trip.mission){try{guildMissionSave(trip);}catch(e){showToast('任務紀錄未能保存，請確認裝置儲存空間');}}guildTrip=null;trip.abort.abort();cancelAnimationFrame(trip.frame);document.removeEventListener('keydown',trip.key,true);
    window.removeEventListener('blur',trip.blur);document.removeEventListener('visibilitychange',trip.visibility);
    guildMapRelease(trip,trip.state);guildMapRelease(trip,trip.pending);trip.state=null;trip.pending=null;trip.buffer.width=1;trip.buffer.height=1;trip.canvas.width=1;trip.canvas.height=1;trip.root.remove();if(typeof sceneKeys!=='undefined')sceneKeys.length=0;
    if(player===trip.subject&&guildOwner()===trip.owner&&inTown()){guildRefresh();const button=document.querySelector('[data-guild-depart]');if(button)button.focus();}
}
