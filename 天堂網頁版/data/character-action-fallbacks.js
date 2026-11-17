// 人物動作圖：左右鏡像與自動影子（使用者 2026-11-17：新人物要少畫圖）。
//  鏡像：某方向沒有圖時，用左右對稱的方向翻轉（W←E、NW←NE、SW←SE，反過來也可以）。只要畫 S、SE、E、NE、N 五個方向。
//   avatars[名].mirror[方向]＝來源方向；character-actions.js 的 fullCharacterPath 會改讀來源方向的圖，畫面加 scaleX(-1)。
//  自動影子：某動作沒有 _s 影子圖時（或 avatar.autoShadow 為 true），用人物圖即時做黑色剪影、往左上壓扁攤在腳底（比例照原版騎士影子量的）。
//  現有 16 個人物 8 方向、影子都齊全，行為不變。載入順序：所有人物動作資料（character-action-data.js、extra-class-data.js、dark-elf-data.js）之後、character-actions.js 之前。
(()=>{
 const A=window.CHARACTER_ACTION_ASSETS;if(!A)return;
 const PAIR={W:'E',E:'W',NW:'NE',NE:'NW',SW:'SE',SE:'SW'};
 for(const data of Object.values(A.avatars)){
  data.directions??={};data.shadows??={};data.mirror??={};
  for(const [h,src] of Object.entries(PAIR))if(!data.directions[h]&&data.directions[src]){data.directions[h]=data.directions[src];data.shadows[h]=data.shadows[src]||{};data.mirror[h]=src;}
  for(const h of Object.keys(data.directions))data.shadows[h]??={};
 }
})();
// 自動影子：回傳跟 characterFrameResource 一樣的 {img,ready,error}；人物圖解碼好之後才產生
const characterAutoShadows=new Map();
function characterAutoShadow(body,data,mirrored=false){ // mirrored：畫面會左右翻轉，影子先反向傾斜，翻完才會跟原版一樣固定往左上倒
 if(!body?.ready)return {ready:false,error:false};
 const key=body.img.src+(mirrored?'|m':'');let item=characterAutoShadows.get(key);if(item)return item;
 const src=body.img,w=src.naturalWidth,h=src.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),foot=data.footY||h*.72;
 const k=mirrored?-.5:.5;g.setTransform(1,0,k,.22,-k*foot,.78*foot);g.drawImage(src,0,0);g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#000';g.fillRect(0,0,w,h);
 const img=new Image();img.draggable=false;item={img,ready:false,error:false};img.onload=()=>{item.ready=true;if(typeof refreshCharacter==='function')refreshCharacter();};img.src=c.toDataURL();
 characterAutoShadows.set(key,item);if(characterAutoShadows.size>400)characterAutoShadows.delete(characterAutoShadows.keys().next().value);return item;
}
