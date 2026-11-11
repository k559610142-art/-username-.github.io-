// Static weak connectivity rejects impossible destinations before running A*.
// Every allowed movement edge is included; cells in different components cannot share a route.
const NavigationConnectivity=(()=>{
 const meta=NAVIGATION_CONNECTIVITY_DATA,raw=Uint8Array.from(atob(meta.rle),c=>c.charCodeAt(0)),data=new DataView(raw.buffer),labels=new Uint32Array(meta.width*meta.height);let offset=0;
 for(let p=0;p<raw.length;p+=8){const value=data.getUint32(p,true),count=data.getUint32(p+4,true);labels.fill(value,offset,offset+count);offset+=count;}if(offset!==labels.length)throw Error('地圖通行索引長度不符');
 function component(x,y){const tx=x-meta.startX,ty=y-meta.startY;return tx<0||ty<0||tx>=meta.width||ty>=meta.height?0:labels[ty*meta.width+tx];}
 function canReach(x,y,tx,ty){if(window.activeMapId!==meta.mapId)return true;const a=component(x,y),b=component(tx,ty);if(a!==0&&!b&&window.NativeCollision?.isEntrance(meta.mapId,tx,ty))return [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].some(([dx,dy])=>component(tx+dx,ty+dy)===a);return a!==0&&a===b;}
 function restore(x,y){if(window.activeMapId!==meta.mapId||component(x,y)!==0)return null;for(let radius=1;radius<=24;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;const tx=x+dx,ty=y+dy;if(component(tx,ty)===1&&navigationDirections.some(([mx,my])=>canTraverse(tx,ty,mx,my)))return {x:tx,y:ty};}return null;}
 return {component,canReach,restore};
})();window.NavigationConnectivity=NavigationConnectivity;
