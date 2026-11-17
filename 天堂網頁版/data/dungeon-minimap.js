// 地監小地圖與樓梯標示（使用者 2026-11-17：騎士洞穴沒有樓梯、小地圖沒有場地縮圖）。
//  小地圖：Map 0／4 以外的地圖改畫 tools/native-map/minimap.js 產生的 assets/native-world/<id>/minimap.png（data/dungeon-minimaps.js 給原生像素範圍），
//   並在小地圖上標出樓梯／出入口（金色點）。
//  樓梯：DB dungeon 表的出入口（DungeonPortals.sources）在地監裡沒有樓梯圖時看不出位置，地上畫一圈發光法陣＋目的地名稱，踩上去就傳送。
//  載入順序：reference-hud.js（paintMini）、dungeon-portals.js、dungeon-minimaps.js 之後。
(()=>{
 const images=new Map(),img=id=>{if(!images.has(id)){const i=new Image();i.src='assets/native-world/'+id+'/minimap.png?v=1';images.set(id,i);}return images.get(id);};
 const dungeon=()=>{const id=window.activeMapId||0;return id!==0&&id!==4&&window.DUNGEON_MINIMAPS?.[id]?id:null;};
 const MAIN={0:'說話之島',4:'大陸'},targetName=(m,x,y)=>{const p=window.DungeonPortals?.portalAt(m,x,y),t=p?.targets?.[0];if(!t)return '出口';return MAIN[t[0]]||window.NATIVE_DUNGEON_MAPS?.[t[0]]?.name||'出口';};
 const basePaint=paintMini;
 paintMini=function(){
  const id=dungeon();if(!id)return basePaint();
  const w=mini.width,h=mini.height,view=getRenderedSceneView(),scale=w/3000,[mx,my,mw,mh]=DUNGEON_MINIMAPS[id],im=img(id);
  mc.clearRect(0,0,w,h);mc.fillStyle='#0d0e0c';mc.fillRect(0,0,w,h);
  if(im.complete&&im.naturalWidth)mc.drawImage(im,w/2+(mx-view.px)*scale,h/2+(my-view.py)*scale,mw*scale,mh*scale);
  mc.fillStyle='#ffd25a';for(const [x,y]of window.DungeonPortals?.sources(id)||[]){const [px,py]=project(x,y),sx=w/2+(px-view.px)*scale,sy=h/2+(py-view.py)*scale;if(sx<-4||sy<-4||sx>w+4||sy>h+4)continue;mc.beginPath();mc.arc(sx,sy,3.2,0,Math.PI*2);mc.fill();}
  mc.fillStyle='#f7dfa4';mc.beginPath();mc.moveTo(w/2,h/2-7);mc.lineTo(w/2-5,h/2+5);mc.lineTo(w/2+5,h/2+5);mc.closePath();mc.fill();
 };
 // 地上的樓梯標示
 const css=document.createElement('style');css.textContent=`
 .dungeon-stairs{position:absolute;inset:0;pointer-events:none;overflow:hidden}
 .dungeon-stair{position:absolute;width:0;height:0}
 .dungeon-stair i{position:absolute;left:calc(-34px*var(--z));top:calc(-17px*var(--z));width:calc(68px*var(--z));height:calc(34px*var(--z));border-radius:50%;
  background:radial-gradient(ellipse,#fff6c8cc 0,#ffd25a99 28%,#ff9a2a55 55%,transparent 72%);box-shadow:0 0 calc(14px*var(--z)) #ffcf5a;animation:dungeonStair 1.6s ease-in-out infinite;mix-blend-mode:screen}
 .dungeon-stair b{position:absolute;left:0;top:calc(-46px*var(--z));transform:translateX(-50%);white-space:nowrap;font:600 12px system-ui;color:#ffe7a8;text-shadow:0 0 3px #000,1px 1px 2px #000}
 @keyframes dungeonStair{0%,100%{opacity:.65;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}`;document.head.append(css);
 const layer=document.createElement('div');layer.className='dungeon-stairs';layer.setAttribute('aria-hidden','true');if(typeof canvas!=='undefined'&&canvas?.after)canvas.after(layer);else game.append(layer);
 let key='',marks=[];
 function tick(){
  requestAnimationFrame(tick);const id=dungeon();if(!id||window.gameFlowState!=='playing'){if(marks.length){layer.replaceChildren();marks=[];key='';}return;}
  const src=window.DungeonPortals?.sources(id)||[],k=id+':'+src.length;
  if(k!==key){key=k;layer.replaceChildren();marks=src.map(([x,y])=>{const d=document.createElement('div');d.className='dungeon-stair';d.append(document.createElement('i'),Object.assign(document.createElement('b'),{textContent:'▼ '+targetName(id,x,y)}));layer.append(d);return {d,x,y};});}
  const v=getRenderedSceneView();layer.style.setProperty('--z',v.zoom);
  for(const m of marks){const [px,py]=project(m.x,m.y),sx=v.ox+px*v.zoom,sy=v.oy+py*v.zoom,on=sx>-80&&sy>-80&&sx<v.width+80&&sy<v.height+80;m.d.hidden=!on;if(on)m.d.style.transform='translate('+sx+'px,'+sy+'px)';}
 }
 requestAnimationFrame(tick);
})();
