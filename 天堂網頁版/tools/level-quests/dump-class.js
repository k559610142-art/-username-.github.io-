// 簡易 Java class 傾印（本機沒有 JDK）：每個方法依序列出整數／字串常數、getstatic（$）與呼叫的方法（@）。
// 用法：先把 Server_Game_2.jar 解壓，node tools/level-quests/dump-class.js com/lineage/data/npc/quest/Npc_Lyra.class
// Minimal Java class dumper: per method, the sequence of int/string constants and invoked method names.
const fs=require('fs');
function dump(file){
 const b=fs.readFileSync(file);let p=8;const u1=()=>b[p++],u2=()=>{const v=b.readUInt16BE(p);p+=2;return v},u4=()=>{const v=b.readUInt32BE(p);p+=4;return v};
 const n=u2(),cp=[null];
 for(let i=1;i<n;i++){const t=u1();
  if(t===1){const l=u2();cp[i]={t,s:b.toString('utf8',p,p+l)};p+=l;}
  else if(t===3){cp[i]={t,v:b.readInt32BE(p)};p+=4;}
  else if(t===4){cp[i]={t,v:b.readFloatBE(p)};p+=4;}
  else if(t===5||t===6){cp[i]={t};p+=8;cp[++i]=null;}
  else if(t===7||t===8||t===16||t===19||t===20){cp[i]={t,a:u2()};}
  else if(t===9||t===10||t===11||t===12||t===17||t===18){cp[i]={t,a:u2(),b:u2()};}
  else if(t===15){cp[i]={t};p+=3;}
  else throw Error('tag '+t+' '+file);}
 const utf=i=>cp[i]?.s;
 const ref=i=>{const c=cp[i];if(!c)return '?';if(c.t===8)return JSON.stringify(utf(c.a));if(c.t===3)return c.v;if(c.t===7)return utf(c.a);if([9,10,11].includes(c.t)){const nt=cp[c.b];return utf(cp[c.a].a).split('/').pop()+'.'+utf(nt.a);}return '?';};
 p+=6;const ic=u2();p+=2*ic;
 const skipAttrs=()=>{const c=u2();for(let i=0;i<c;i++){p+=2;const l=u4();p+=l;}};
 const fc=u2();for(let i=0;i<fc;i++){p+=6;skipAttrs();}
 const mc=u2(),out=[];
 const LEN={0x10:2,0x11:3,0x12:2,0x13:3,0x14:3,0x15:2,0x16:2,0x17:2,0x18:2,0x19:2,0x36:2,0x37:2,0x38:2,0x39:2,0x3a:2,0x84:3,0xa9:2,0xb2:3,0xb3:3,0xb4:3,0xb5:3,0xb6:3,0xb7:3,0xb8:3,0xb9:5,0xba:5,0xbb:3,0xbc:2,0xbd:3,0xc0:3,0xc1:3,0xc5:4,0xc6:3,0xc7:3,0xc8:5,0xc9:5};
 for(let i=0;i<mc;i++){p+=2;const name=utf(u2());p+=2;const ac=u2();
  for(let a=0;a<ac;a++){const an=utf(u2()),l=u4(),end=p+l;
   if(an==='Code'){p+=4;const cl=u4(),start=p,seq=[];
    let guard=0;while(p<start+cl&&guard++<200000){const op=b[p];const before=p;
     if(op>=0x02&&op<=0x08)seq.push(op-3);
     else if(op===0x10)seq.push(b.readInt8(p+1));
     else if(op===0x11)seq.push(b.readInt16BE(p+1));
     else if(op===0x12)seq.push(ref(b[p+1]));
     else if(op===0x13)seq.push(ref(b.readUInt16BE(p+1)));
     else if(op>=0xb6&&op<=0xb9)seq.push("@"+ref(b.readUInt16BE(p+1)));else if(op===0xb2)seq.push("$"+ref(b.readUInt16BE(p+1)));
     if(op===0xaa){let q=p+1;while((q-start)%4)q++;const lo=b.readInt32BE(q+4),hi=b.readInt32BE(q+8);p=q+12+4*(hi-lo+1);if(p<=before)break;continue;}
     if(op===0xab){let q=p+1;while((q-start)%4)q++;const np=b.readInt32BE(q+4);p=q+8+8*np;continue;}
     if(op===0xc4){p+=b[p+1]===0x84?6:4;continue;}
     p+=LEN[op]||1;}
    out.push(name+': '+seq.join(' '));}
   p=end;}}
 return out.join('\n');
}
for(const f of process.argv.slice(2))console.log('=== '+f.split(/[\/]/).pop()+'\n'+dump(f));
