// 相鄰場景在同一個世界座標中排列；角色穿過村口即可進入南方平原。
Game.adventureMap = {
  id:'qingshi-and-plains',width:40,height:56,tileSize:32,
  spawn:Game.villageMap.spawn,
  buildings:Game.villageMap.buildings,npcs:Game.villageMap.npcs,
  scenes:[
    {id:'village-1',name:'青石鎮',y:0,height:28,image:'images/maps/qingshi-village-v2.png',safe:true},
    {id:'field-1-1',name:'青嵐平原',y:28,height:28,image:'images/maps/qinglan-plains-v1.png',safe:false}
  ],
  sceneAt(y){return this.scenes[y<28?0:1];},
  isBlocked(x,y){
    if(x<0||x>=40||y<0||y>=56)return true;
    if(x>=18&&x<=21&&y>=26&&y<=29)return false;
    if(y<28)return Game.villageMap.isBlocked(x,y);
    const local=y-28;
    if(local<2||local>=27||x<3||x>=32)return true;
    return (x>=6&&x<=13&&local>=3&&local<=10)||(x>=22&&x<=31&&local>=15&&local<=21);
  },
  isWater(x,y){return x>=32&&x<=37;},
  isRoad(x,y){return y<28?Game.villageMap.isRoad(x,y):(x>=18&&x<=21)||(y>=41&&y<=43);}
};
for(const scene of Game.adventureMap.scenes){
  const entry=Game.world.scenes.find(s=>s.id===scene.id);
  if(entry){entry.name=scene.name;entry.status='prototype';entry.asset=scene.image;}
}
