// Character-owned coordinate records. Base limit from CharBookInitCount=60.
const Bookmarks=(()=>{
 const limit=60,overlay=document.querySelector('#panel'),content=document.querySelector('#panelContent');
 const cleanName=value=>typeof value==='string'?value.trim():'';
 function valid(row){return row&&typeof row.id==='string'&&row.id.length>0&&row.id.length<=80&&cleanName(row.name)&&Array.from(cleanName(row.name)).length<=40&&!/[\u0000-\u001f]/.test(row.name)&&Number.isInteger(row.mapId)&&row.mapId>=0&&row.mapId<=32767&&Number.isInteger(row.x)&&row.x>=0&&row.x<=65535&&Number.isInteger(row.y)&&row.y>=0&&row.y<=65535;}
 function validate(rows){if(!Array.isArray(rows))return [];const seen=new Set(),names=new Set();return rows.filter(row=>{if(!valid(row)||seen.has(row.id)||names.has(row.name.toLocaleLowerCase()))return false;seen.add(row.id);names.add(row.name.toLocaleLowerCase());return true}).slice(0,limit).map(r=>({id:r.id,name:cleanName(r.name),mapId:r.mapId,x:r.x,y:r.y}));}
 function rows(){return validate(window.activeBookmarks||[]);}
 function find(id){return rows().find(r=>r.id===id);}
 function persist(next){if(window.gameFlowState!=='playing'||!window.activeCharacterId)return false;const previous=window.activeBookmarks;window.activeBookmarks=next;if(!GameEntry.saveActive()){window.activeBookmarks=previous;return false}return true;}
 function add(name){
  if(window.gameFlowState!=='playing'||CharacterActions.dead)return '倒地時無法記憶座標。';
  const mapId=window.activeMapId||0;if(!TeleportMapRules[mapId]?.markable)return '此地區不能記憶座標。';
  name=cleanName(name);const all=rows();if(!name||Array.from(name).length>40||/[\u0000-\u001f]/.test(name))return '請輸入 1～40 字的地點名稱。';
  if(all.length>=limit)return '記憶座標已達 '+limit+' 筆上限。';if(all.some(r=>r.name.toLocaleLowerCase()===name.toLocaleLowerCase()))return '已有同名的記憶座標。';
  if(all.some(r=>r.mapId===mapId&&r.x===worldX&&r.y===worldY))return '這個位置已經記憶。';
  const record={id:globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name,mapId,x:worldX,y:worldY};
  return persist([...all,record])?'':'無法儲存座標，原有資料未變更。';
 }
 function remove(id){const all=rows();return all.some(r=>r.id===id)&&persist(all.filter(r=>r.id!==id));}
 const style=document.createElement('style');style.textContent='.reference-game #panel.bookmark-panel{z-index:25!important}.bookmark-heading{margin-right:100px!important}.bookmark-current{font-size:14px;color:#dbc99c}.bookmark-save{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 0}.bookmark-save input{flex:1;min-width:130px;min-height:44px;padding:8px;background:#122431;color:#eee1b8;border:1px solid #8a8c6c;box-sizing:border-box}.bookmark-panel button,.bookmark-panel select{min-height:44px;padding:6px 12px;background:#26372d;color:#f2dfb5;border:1px solid #978456;border-radius:3px}.bookmark-panel button:disabled{opacity:.4;cursor:default}.bookmark-mode{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 12px}.bookmark-mode select{max-width:100%}.bookmark-note{font-size:12px;line-height:1.6;color:#bdc8c8}.bookmark-list{display:grid;gap:8px;max-height:48dvh;overflow:auto}.bookmark-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:10px;border:1px solid #76816c;background:#142625}.bookmark-row strong{color:#edddb7;overflow-wrap:anywhere}.bookmark-row small{display:block;color:#c6cdbf;font-size:12px;margin-top:5px}.bookmark-message{min-height:18px;color:#ebc67c;font-size:13px}.bookmark-footer{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}@media(max-width:500px){.bookmark-row{gap:5px;padding:8px}.bookmark-row button{padding:5px 8px}.bookmark-save input{width:100%}.bookmark-heading{font-size:20px!important}}';document.head.append(style);
 function open(options={}){
  if(window.gameFlowState!=='playing'||CharacterActions.dead)return;
  cancelPointerGesture({preserveNavigation:true});previous=document.activeElement;
  overlay.classList.remove('classic-panel','reference-menu-panel','game-catalog-panel','map-overview-panel');overlay.classList.add('bookmark-panel');overlay.hidden=false;overlay.setAttribute('aria-label','記憶座標');overlay.querySelector('#close').hidden=false;
  const title=uiElement('h2','bookmark-heading','記憶座標'),current=uiElement('p','bookmark-current'),save=uiElement('div','bookmark-save'),input=uiElement('input'),remember=uiElement('button','','記憶當前座標'),message=uiElement('p','bookmark-message'),mode=uiElement('div','bookmark-mode'),select=uiElement('select'),list=uiElement('div','bookmark-list'),note=uiElement('p','bookmark-note','使用祝福瞬間移動卷軸，或裝備傳送控制戒指並使用一般瞬移卷，可前往已記憶座標。'),footer=uiElement('div','bookmark-footer'),back=uiElement('button','','返回地圖'),random=uiElement('button','','隨機瞬間移動');
  input.type='text';input.maxLength=40;input.placeholder='地點名稱';input.setAttribute('aria-label','記憶地點名稱');input.value='說話之島 '+worldX+','+worldY;select.setAttribute('aria-label','傳送使用道具');message.setAttribute('role','status');remember.type='button';remember.onclick=()=>{const error=add(input.value);render(error||'座標已記憶。');};
  input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();remember.click()}};save.append(input,remember);mode.append(uiElement('span','','傳送道具'),select);back.onclick=()=>document.querySelector('#overview').click();random.onclick=()=>{if(select.value&&TeleportScrolls.random(select.value))closePanel()};footer.append(back,random);content.replaceChildren(title,current,save,note,mode,message,list,footer);
  function render(info=''){
   message.textContent=info;current.textContent='目前位置：說話之島 · '+worldX+', '+worldY+'　記憶 '+rows().length+' / '+limit;
   const chosen=select.value||options.scrollUid,methods=TeleportScrolls.methods();select.replaceChildren();for(const item of methods){const option=document.createElement('option');option.value=item.uid;option.textContent=item.label+' × '+item.count;select.append(option)}if(methods.some(m=>m.uid===chosen))select.value=chosen;select.disabled=!methods.length;random.disabled=!methods.length;
   if(!methods.length){const option=document.createElement('option');option.value='';option.textContent='尚無可使用的傳送道具';select.append(option)}
   list.replaceChildren();for(const row of rows()){
    const line=uiElement('div','bookmark-row'),info=uiElement('div'),name=uiElement('strong','',row.name),coords=uiElement('small','',WorldMaps.name(row.mapId)+' · '+row.x+', '+row.y),go=uiElement('button','','前往'),del=uiElement('button','','×');info.append(name,coords);go.type=del.type='button';go.setAttribute('aria-label','前往 '+row.name);del.setAttribute('aria-label','刪除座標 '+row.name);
    go.disabled=!methods.length||row.mapId!==(window.activeMapId||0)||row.x===worldX&&row.y===worldY;go.onclick=()=>{if(TeleportScrolls.toBookmark(select.value,row.id))closePanel();else message.textContent='目前無法傳送，請確認道具、地點及使用冷卻。'};del.onclick=()=>{if(confirm('刪除記憶座標「'+row.name+'」？'))render(remove(row.id)?'已刪除座標。':'無法儲存變更。')};line.append(info,go,del);list.append(line);
   }
   if(!list.children.length)list.append(uiElement('p','bookmark-note','尚未記憶任何座標。'));
  }
  select.onchange=()=>{};render();input.focus();overlay.scrollTop=0;
 }
 new MutationObserver(()=>{if(overlay.hidden||!content.querySelector('.bookmark-heading'))overlay.classList.remove('bookmark-panel')}).observe(overlay,{attributes:true,childList:true,subtree:true,attributeFilter:['hidden']});
 return {open,add,remove,find,validate,get rows(){return rows()},limit};
})();window.Bookmarks=Bookmarks;
