// 只分析 PNG 透明度及來源座標，不修改圖片像素。
import fs from 'node:fs';
import zlib from 'node:zlib';
const file=process.argv[2], target=process.argv[3];
const clip=process.argv[4]||'',columns=Number(process.argv[5]||4),rows=Number(process.argv[6]||8);
if(!file||!target)throw Error('Usage: node measure-character.mjs input.png output.js');
const b=fs.readFileSync(file),w=b.readUInt32BE(16),h=b.readUInt32BE(20),chunks=[];
if(b[24]!==8||b[25]!==6||b[28]!==0)throw Error('Expected 8-bit noninterlaced RGBA PNG');
for(let i=8;i<b.length;){const n=b.readUInt32BE(i);if(b.toString('ascii',i+4,i+8)==='IDAT')chunks.push(b.subarray(i+8,i+8+n));i+=n+12;}
const raw=zlib.inflateSync(Buffer.concat(chunks));let prev=Buffer.alloc(w*4),at=0;
const alpha=Buffer.alloc(w*h),rowMass=new Array(h).fill(0);
for(let y=0;y<h;y++){
  const f=raw[at++],row=Buffer.from(raw.subarray(at,at+w*4));at+=w*4;
  for(let x=0;x<row.length;x++){
    const a=x>=4?row[x-4]:0,c=x>=4?prev[x-4]:0,u=prev[x];let v=0;
    if(f===1)v=a;if(f===2)v=u;if(f===3)v=Math.floor((a+u)/2);
    if(f===4){const p=a+u-c,pa=Math.abs(p-a),pb=Math.abs(p-u),pc=Math.abs(p-c);v=pa<=pb&&pa<=pc?a:pb<=pc?u:c;}
    row[x]=(row[x]+v)&255;
  }
  for(let x=0;x<w;x++){alpha[y*w+x]=row[x*4+3];if(row[x*4+3]>60)rowMass[y]++;}
  prev=row;
}
// 生成圖的列距略有偏差；從透明間隙找分隔，避免平均切格截斷鞋底。
const cuts=[0];
for(let r=1;r<rows;r++){const expected=r*h/rows;let best=Math.round(expected),score=Infinity;for(let y=Math.round(expected-32);y<=Math.round(expected+32);y++){const value=rowMass[y]+Math.abs(y-expected)*0.08;if(value<score){score=value;best=y;}}cuts.push(best);}
cuts.push(h);
const boxes=[];
for(let r=0;r<rows;r++)for(let col=0;col<columns;col++){
  const box={x:w,y:h,right:0,bottom:0,mass:0,sumX:0};
  for(let y=cuts[r];y<cuts[r+1];y++)for(let x=Math.ceil(col*w/columns);x<Math.ceil((col+1)*w/columns);x++)if(alpha[y*w+x]>60){
    box.x=Math.min(box.x,x);box.y=Math.min(box.y,y);box.right=Math.max(box.right,x);box.bottom=Math.max(box.bottom,y);
    const relativeY=(y-cuts[r])/(cuts[r+1]-cuts[r]);
    if(relativeY>=0.35&&relativeY<=0.5){box.mass+=alpha[y*w+x];box.sumX+=x*alpha[y*w+x];}
  }
  boxes.push(box);
}
const frames=boxes.map(a=>({x:a.x,y:a.y,w:a.right-a.x+1,h:a.bottom-a.y+1}));
const pivots=boxes.map((a,i)=>({x:Math.round(a.mass?a.sumX/a.mass:(a.x+a.right)/2),y:Math.max(...boxes.slice(Math.floor(i/columns)*columns,Math.floor(i/columns)*columns+columns).map(b=>b.bottom))+1}));
if(frames.some(f=>f.w<=0||f.h<=0))throw Error('Empty animation cell');
const key=clip?'Game.characters.swordsman.walk.clips['+JSON.stringify(clip)+']':'Game.characters.swordsman.walk';
fs.writeFileSync(target,'// PNG source bounds and fixed ground-line pivots.\n'+key+'.frames = '+JSON.stringify(frames)+';\n'+key+'.pivots = '+JSON.stringify(pivots)+';\n');
console.log(JSON.stringify({width:w,height:h,frames:frames.length,rowCuts:cuts}));
