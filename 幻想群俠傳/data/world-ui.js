Game.initWorld = function () {
  const w = this.world, grid = document.getElementById('world-grid');
  const kinds = { village:'村鎮',castle:'城堡',field:'野外',dungeon:'地下城',undersea:'海底',tower:'混沌之塔' };
  const select = document.getElementById('scene-filter');
  Object.entries(kinds).forEach(([id,name]) => select.add(new Option(name,id)));
  document.getElementById('world-summary').textContent = `${w.columns} × ${w.rows} 分塊，共 ${w.tiles.length} 個圖片位置 · ${w.scenes.length} 個規劃場景 · 圖片製作 0 / ${w.tiles.length}`;
  let selectedTile = null;
  const renderList = () => {
    const scenes = w.scenes.filter(s => (!select.value || s.kind === select.value) && (!selectedTile || s.tileId === selectedTile));
    document.getElementById('world-selection').textContent = selectedTile ? `分塊 ${selectedTile} · ${scenes.length} 個場景` : `全部分塊 · ${scenes.length} 個場景`;
    document.getElementById('scene-list').replaceChildren(...scenes.map(s => {
      const li = document.createElement('li');
      li.textContent = `${s.name}${s.bossFloor ? ' · 首領層' : ''} ｜ ${kinds[s.kind]} ｜ ${w.regions.find(r=>r.id===s.regionId).name} ｜ ${s.status === 'prototype' ? '已接通，可行走' : '待製作'}`;
      return li;
    }));
    if (!scenes.length) { const li=document.createElement('li'); li.textContent='此分塊尚無符合篩選的場景。'; document.getElementById('scene-list').append(li); }
  };
  w.tiles.forEach(tile => {
    const region = w.regions.find(r=>r.id===tile.regionId), scenes = w.scenes.filter(s=>s.tileId===tile.id);
    const button=document.createElement('button');
    button.className=`world-tile terrain-${region.terrain}`;
    button.title = `${region.name} (${tile.x}, ${tile.y}) · ${scenes.length} 個場景`;
    button.setAttribute('aria-label',button.title); button.setAttribute('aria-pressed','false');
    button.textContent = scenes.some(s=>s.kind==='tower') ? '塔' : scenes.some(s=>s.kind==='castle') ? '城' : scenes.some(s=>s.kind==='village') ? '村' : scenes.some(s=>s.kind==='undersea') ? '海' : scenes.some(s=>s.kind==='dungeon') ? '窟' : scenes.length ? '·' : '';
    button.onclick=()=>{selectedTile=tile.id;grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderList();};
    grid.append(button);
  });
  select.onchange=renderList;
  document.getElementById('world-all').onclick=()=>{selectedTile=null;grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));renderList();};
  renderList();
};
