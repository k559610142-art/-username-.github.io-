// User reference artwork; six colors plus the dragon motion sampled from the supplied video.
window.SoulRingVisuals=(()=>{
 const source='assets/interface/wuhun-rings/reference-new.jpg?v=2',ns='http://www.w3.org/2000/svg';

 function create(level){
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 384 384');svg.setAttribute('overflow','hidden');svg.setAttribute('aria-hidden','true');svg.dataset.ringLevel=String(level);
  if(level===7){
   svg.classList.add('soul-dragon');
   const xs=Array.from({length:120},(_,i)=>-(i%10)*384).join(';'),ys=Array.from({length:120},(_,i)=>-Math.floor(i/10)*384).join(';');
   svg.innerHTML=`<image href="assets/interface/wuhun-rings/dragon-atlas.png?v=2" width="3840" height="4608"><animate attributeName="x" values="${xs}" dur="10s" calcMode="discrete" repeatCount="indefinite"/><animate attributeName="y" values="${ys}" dur="10s" calcMode="discrete" repeatCount="indefinite"/></image>`;
  }else{
   const n=Math.min(5,Math.max(0,level-1));
   svg.innerHTML=`<image href="assets/interface/wuhun-rings/ring-live-${n+1}.png?v=approved3" width="384" height="384"/>`;
  }
  return svg;
 }
 // White starts at chest height; the wider hoops descend to red at the feet.
 const layout=Object.freeze(Array.from({length:6},(_,i)=>Object.freeze({radius:22+i*2,rise:(5-i)*7.2})));
 function dragonEnabled(slots,tier){return tier==='四神獸'&&Array.isArray(slots)&&slots.length===6&&Array.from(slots).every(id=>id!=null);}
 const dragonLayout=Object.freeze({radius:62,rise:44});
 const showPhantom=tier=>tier!=='四神獸';
 return {create,source,layout,dragonLayout,dragonEnabled,showPhantom};
})();
