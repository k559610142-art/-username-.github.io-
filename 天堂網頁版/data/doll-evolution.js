// Display families only. Never change doll ownership, effects, recipe costs or rates.
window.DollEvolution=(()=>{
 const byId=new Map(gameCatalogData.dolls.map(d=>[d.id,d]));
 const range=(start,count)=>Array.from({length:count},(_,i)=>start+i);
 const definitions=[
  ...[55029,55035,55041,55047,55053,55059,55065,55071,55077,80268,80274].map(id=>({paths:[range(id,6)]})),
  {paths:[range(55084,4)]},{paths:[range(80254,5)]},
  {paths:[[80280,80281,80282,80283],[80280,80286,80287,80288]],variants:[{parent:80283,ids:range(80290,15)},{parent:80288,ids:range(80305,15)}]},
  {paths:[[39149,39150]]},
  ...[80365,80368,80371,80374].map(id=>({paths:[range(id,3)]})),
  {paths:[[80385,80512]]},{paths:[[80384,80513]]},{paths:[[80386,80514]]}
 ];
 const families=[],familyById=new Map();
 for(const definition of definitions){
  const paths=definition.paths.map(ids=>ids.filter(id=>byId.has(id))).filter(ids=>ids.length>1);
  if(!paths.length)continue;
  const variants=(definition.variants||[]).filter(v=>byId.has(v.parent)).map(v=>({...v,ids:v.ids.filter(id=>byId.has(id))}));
  const ids=[...new Set([...paths.flat(),...variants.flatMap(v=>v.ids)])],family={root:paths[0][0],paths,variants,ids};
  families.push(family);for(const id of ids){if(familyById.has(id))throw Error('Duplicate doll family '+id);familyById.set(id,family);}
 }
 const get=id=>byId.get(Number(id));
 const family=id=>familyById.get(Number(id))||null;
 const rootId=id=>family(id)?.root??Number(id);
 const members=id=>(family(id)?.ids||[Number(id)]).map(get).filter(Boolean);
 const bases=()=>gameCatalogData.dolls.filter(d=>rootId(d.id)===d.id);
 return {get,family,rootId,members,bases,families};
})();
