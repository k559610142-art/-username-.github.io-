// classanim 的走路 PNG 已烘入每格的地圖位移。反向抵消它，避免每輪回到原點。
// 單位為原圖像素：八方向對應 scene-renderer.js 的等角投影。
const characterWalkDisplacement=Object.freeze({N:[0,-24],NE:[24,-12],E:[48,0],SE:[24,12],S:[0,24],SW:[-24,12],W:[-48,0],NW:[-24,-12]});
function characterWalkCorrection(pose,data,heading){
 if(!pose.clip.endsWith('_walk'))return {x:0,y:0};
 const count=data.directions[heading]?.[pose.clip],delta=characterWalkDisplacement[heading];
 if(!count||!delta||!Number.isInteger(pose.frame)||pose.frame<0||pose.frame>=count)return {x:0,y:0};
 // 依原圖編號計算，不使用播放姿勢序號；女法師 8 張圖會播放 0/2/4/6。
 const phase=pose.frame/count;return {x:-delta[0]*phase,y:-delta[1]*phase};
}
