// 角色視覺資料與遊戲數值分開；後續可新增職業與方向動畫。
Game.characters = {
  swordsman: {
    id: 'swordsman', name: '初行俠客', role: '持劍俠客',
    image: 'images/characters/swordsman-v1.png',
    renderHeight: 68,
    footAnchor: 0.93,
    description: '青衣白袍，束髮佩劍。從青石鎮踏上江湖。',
    mode: 'directional-spritesheet',
    walk: {
      columns:4, rows:2,
      clips:Object.fromEntries(['s','sw','w','nw','n','ne','e','se'].map(id=>[id,{image:`images/characters/walk-v3/${id}.png`}])),
      directions:[
        {name:'南 ↓',id:'s'},
        {name:'西南 ↙',id:'sw'},
        {name:'西 ←',id:'w'},
        {name:'西北 ↖',id:'nw'},
        {name:'北 ↑',id:'n'},
        {name:'東北 ↗',id:'ne'},
        {name:'東 →',id:'e'},
        {name:'東南 ↘',id:'se'}
      ],
      // 參考提供檔案 spr_action.sql 的 spr_id=0, act_id=4。
      timing: { frameCount:16, frameRate:24, baseTickMs:40, referenceRate:24, hasteMultiplier:0.755 },
      poseTimeline:[0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7]
    }
  }
};
