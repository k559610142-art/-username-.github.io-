// Convert Lineage .img (u16 width, u16 height, u16 flag, RGB555 pixels) to PNG. flag 1: pure black = transparent.
const zlib=require('zlib');
const crcT=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c});
const crc=b=>{let c=-1;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^-1)>>>0};
const chunk=(t,d)=>{const b=Buffer.alloc(12+d.length);b.writeUInt32BE(d.length,0);b.write(t,4,'latin1');d.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,8+d.length)),8+d.length);return b};
function rgbaPng(w,h,px){const raw=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)px.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))])}
function imgToRgba(b){const w=b.readUInt16LE(0),h=b.readUInt16LE(2),flag=b.readUInt16LE(4);if(!w||!h||6+w*h*2>b.length)return null;const px=Buffer.alloc(w*h*4);for(let i=0;i<w*h;i++){const v=b.readUInt16LE(6+i*2);px[i*4]=(v>>10&31)*255/31;px[i*4+1]=(v>>5&31)*255/31;px[i*4+2]=(v&31)*255/31;px[i*4+3]=flag===1&&v===0?0:255}return {w,h,flag,px}}
module.exports={imgToRgba,rgbaPng};
