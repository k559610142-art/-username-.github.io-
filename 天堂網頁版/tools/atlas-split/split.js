// Split native 2048x2048 atlases (32x32 tiles of 64px) into small pages of COLS x COLS tiles.
// Tile ids stay the same: page = floor(id / (COLS*COLS)), slot = id % (COLS*COLS).
// Usage: node tools/atlas-split/split.js assets/native-world [cols=8]
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const dir=path.resolve(process.argv[2]),COLS=+(process.argv[3]||8),PER=COLS*COLS,OUT='atlas'+PER;
const old=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
const crcTable=new Int32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c});
const crc=b=>{let c=-1;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^-1)>>>0};
function decode(buf){let p=8,w,h,idat=[];while(p<buf.length){const len=buf.readUInt32BE(p),type=buf.toString('latin1',p+4,p+8),data=buf.subarray(p+8,p+8+len);if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);if(data[8]!==8||data[9]!==6||data[12]!==0)throw Error('unsupported png')}else if(type==='IDAT')idat.push(data);p+=12+len}
 const raw=zlib.inflateSync(Buffer.concat(idat)),out=Buffer.alloc(w*h*4),stride=w*4;
 for(let y=0;y<h;y++){const f=raw[y*(stride+1)],src=y*(stride+1)+1,dst=y*stride;for(let i=0;i<stride;i++){const a=i>=4?out[dst+i-4]:0,b=y?out[dst+i-stride]:0,c=i>=4&&y?out[dst+i-stride-4]:0;let v=raw[src+i];if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c}out[dst+i]=v&255}}
 return {w,h,data:out}}
function chunk(type,data){const b=Buffer.alloc(12+data.length);b.writeUInt32BE(data.length,0);b.write(type,4,'latin1');data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,8+data.length)),8+data.length);return b}
function encode(w,h,px){const stride=w*4,raw=Buffer.alloc(h*(stride+1)),row=Buffer.alloc(stride);
 for(let y=0;y<h;y++){let best=null,bestSum=Infinity,bestF=0;for(let f=0;f<5;f++){let sum=0;for(let i=0;i<stride;i++){const x=px[y*stride+i],a=i>=4?px[y*stride+i-4]:0,b=y?px[(y-1)*stride+i]:0,c=i>=4&&y?px[(y-1)*stride+i-4]:0;let p=f===0?0:f===1?a:f===2?b:f===3?(a+b)>>1:(()=>{const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c})();const v=(x-p)&255;row[i]=v;sum+=v<128?v:256-v}if(sum<bestSum){bestSum=sum;bestF=f;best=Buffer.from(row)}}raw[y*(stride+1)]=bestF;best.copy(raw,y*(stride+1)+1)}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))])}
fs.mkdirSync(path.join(dir,OUT),{recursive:true});
const total=old.tileBlocks,pages=Math.ceil(total/PER),atlas=new Array(pages),S=COLS*64;let bytes=0,empty=0;
for(let a=0;a<old.atlas.length;a++){const img=decode(fs.readFileSync(path.join(dir,old.atlas[a])));
 for(let sub=0;sub<1024/PER;sub++){const page=a*(1024/PER)+sub;if(page*PER>=total)break;const px=Buffer.alloc(S*S*4);
  for(let s=0;s<PER;s++){const oldSlot=sub*PER+s,ox=(oldSlot%32)*64,oy=Math.floor(oldSlot/32)*64,nx=(s%COLS)*64,ny=Math.floor(s/COLS)*64;for(let y=0;y<64;y++)img.data.copy(px,((ny+y)*S+nx)*4,((oy+y)*img.w+ox)*4,((oy+y)*img.w+ox+64)*4)}
  const name=OUT+'/p-'+page+'.png',png=encode(S,S,px);fs.writeFileSync(path.join(dir,name),png);fs.writeFileSync(path.join(dir,name+'.js'),'window.__nativeAtlasReceive('+page+',"'+png.toString('base64')+'");');atlas[page]=name;bytes+=png.length}
 if(a%20===0)console.log('atlas',a,'/',old.atlas.length,(bytes/1048576).toFixed(1)+'MB')}
const next={...old,atlas,atlasTiles:PER,atlasColumns:COLS};fs.writeFileSync(path.join(dir,'manifest-'+OUT+'.json'),JSON.stringify(next));
fs.writeFileSync(path.join(dir,'manifest-'+OUT+'.json.js'),"window.__nativeWorldReceive('manifest-"+OUT+".json',"+JSON.stringify(next)+");");
console.log('done pages',pages,'MB',(bytes/1048576).toFixed(1));
