// Decode Lineage .tbt (newer inventory icons): u8 x, u8 y, u8 w, u8 h, then per row: u8 segments,
// each segment u8 skip + u8 count + count×RGB555 (u16 LE). Pixels outside segments are transparent.
function tbtToRgba(b){
 const w=b[2],h=b[3];if(!w||!h)return null;const px=Buffer.alloc(w*h*4);let o=4;
 for(let y=0;y<h&&o<b.length;y++){let x=0;const n=b[o++];for(let s=0;s<n&&o<b.length;s++){x+=b[o++];const c=b[o++];for(let k=0;k<c&&o+1<b.length;k++,x++){const v=b.readUInt16LE(o);o+=2;if(x>=w)continue;const i=(y*w+x)*4;px[i]=(v>>10&31)*255/31;px[i+1]=(v>>5&31)*255/31;px[i+2]=(v&31)*255/31;px[i+3]=255;}}}
 return {w,h,px,consumed:o};
}
module.exports={tbtToRgba};
