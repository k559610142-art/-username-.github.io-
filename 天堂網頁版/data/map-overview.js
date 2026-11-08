// Overview navigation uses the supplied local Aden continent atlas.
(()=>{
 const overview=document.querySelector('#overview'),openIsland=overview.onclick;
 const style=document.createElement('style');style.textContent='.reference-game #panel.map-overview-panel{z-index:25!important}.map-overview-header{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding-right:100px;margin-bottom:12px}.map-overview-header h2{margin:0!important;flex:1;font-size:clamp(18px,2.3vw,30px)!important}.map-overview-tabs{display:flex;gap:8px;flex-wrap:wrap;max-width:100%}.map-overview-tabs button{min-height:44px;padding:7px 14px;background:#23352a;color:#f4dfb3;border:1px solid #9e8b55;border-radius:4px;cursor:pointer}.map-overview-tabs button[aria-pressed=true]{background:#68572b;color:#fff3cb}.map-continent-image{display:block;width:100%;height:auto;object-fit:contain;background:#172424}.map-overview-panel .mapcaption{font-size:13px}.map-overview-panel .fullmap{max-width:100%;height:auto}';document.head.append(style);
 function open(mainland=false){
  openIsland();
  const overlay=document.querySelector('#panel'),content=document.querySelector('#panelContent');overlay.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel');overlay.classList.add('map-overview-panel');overlay.setAttribute('aria-label',mainland?'亞丁大陸地圖':'說話之島地圖');
  if((window.activeMapId||0)===4){const c=content.querySelector('#fullmap'),p=c.getContext('2d');c.width=2048;c.height=1024;p.drawImage(preview,0,0,2048,1024);const q=project(worldX,worldY);p.fillStyle='#fff';p.strokeStyle='#d24936';p.lineWidth=3;p.beginPath();p.arc(q[0]/76800*2048,q[1]/38400*1024,6,0,Math.PI*2);p.fill();p.stroke();content.querySelector('h2').textContent='亞丁大陸 · 當前區域';content.querySelector('.mapcaption').textContent='天地劫 Map 4 · 亞丁大陸';content.querySelector('#home')?.remove();}
  const title=content.querySelector('h2'),header=document.createElement('div'),tabs=document.createElement('div');header.className='map-overview-header';tabs.className='map-overview-tabs';
  for(const [label,mode]of [['說話之島',false],['大陸地圖',true]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(mainland===mode));b.onclick=()=>open(mode);tabs.append(b);}
  const coordinates=document.createElement('button');coordinates.type='button';coordinates.textContent='座標';coordinates.setAttribute('aria-label','開啟記憶座標');coordinates.onclick=()=>Bookmarks.open();tabs.append(coordinates);
  header.append(title,tabs);content.prepend(header);
  if(mainland){title.textContent='亞丁大陸';const image=document.createElement('img');image.className='map-continent-image';image.src='assets/maps/aden-continent.webp';image.alt='亞丁大陸全圖：古魯丁、肯特、奇岩、海音、歐瑞、亞丁及周邊地區';content.querySelector('#fullmap').replaceWith(image);content.querySelector('.mapcaption').textContent='亞丁大陸 · 城鎮與地區全圖';content.querySelector('#home')?.remove();}
  overlay.scrollTop=0;
 }
 overview.onclick=()=>open(false);
 new MutationObserver(()=>{if(!document.querySelector('.map-overview-header')||document.querySelector('#panel').hidden)document.querySelector('#panel').classList.remove('map-overview-panel')}).observe(document.querySelector('#panel'),{attributes:true,childList:true,subtree:true,attributeFilter:['hidden']});
})();
