// 武魂道具改用武魂卡牌圖示（使用者 2026-11-17：道具欄的武魂道具換成武魂卡牌圖）。
// 圖檔 assets/interface/wuhun/cards/wuhun-<id>.png＝圖鑑卡框（依品級：下品白／上品綠／極品藍／千年紅／萬年紫／上古金／四神獸青）＋武魂圖，由程式合成。
// 載入順序：item-icon-overrides.js 之後、owned-inventory.js 之前（背包載入時建立道具清單）。
(()=>{
 const IDS=new Set([39311,39312,39313,39301,39302,39303,39304,39305,39306,39307,39308,39309,39310,39291,39292,39293,39294,39295,39296,39297,39298,39299,39300,39266,39269,39270,39275,39276,39277,39265,39278,39279,39280,39281,39282,39285,39267,39268,39283,39284,39286,39271,39272,39273,39274]);
 for(const item of INTERFACE_CATALOG.items)if(item.kind==='etcitem'&&IDS.has(item.id))item.icon='assets/interface/wuhun/cards/wuhun-'+item.id+'.png?v=1';
 // 武魂結晶（39287）道具圖：使用者 2026-11-18 提供的水晶圖，裁成 64×64（assets/interface/items/wuhun-crystal.png）
 for(const item of INTERFACE_CATALOG.items)if(item.kind==='etcitem'&&item.id===39287)item.icon='assets/interface/items/wuhun-crystal.png?v=1';
})();
