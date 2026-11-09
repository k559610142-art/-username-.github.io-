// Lineage 1 client .idx/.pak reader (re-implementation of the open-source PakViewer L1PakTools decoder).
// Tables Map1..Map5 come from PakViewer Properties/Resources.resx, saved as tools/client-pak/maps.json.
const fs=require('fs'),path=require('path');
const M=JSON.parse(fs.readFileSync(path.join(__dirname,'maps.json'),'utf8'));
const Map1=Buffer.from(M.Map1,'base64'),Map2=Buffer.from(M.Map2,'base64'),Map3=Buffer.from(M.Map3,'base64'),Map4=Buffer.from(M.Map4,'base64'),Map5=Buffer.from(M.Map5,'base64');
function perm(a1,a2){const o=new Uint8Array(8);for(let n=0,i=0;n<16;n+=2,i++){const b=a1[i],hi=b>>4,lo=b&15;for(let k=0;k<8;k++){const base=n*128+k;o[k]|=a2[base+hi*8]|a2[base+(16+lo)*8]}}return o}
function expand(a){return [(a[3]<<7|((a[0]&249|a[0]>>2&6)>>1))&255,(((a[0]&1|a[0]<<2)<<3)|((a[1]>>2|a[1]&135)>>3))&255,(a[2]>>7|((a[1]&31|(a[1]&248)<<2)<<1))&255,(a[1]<<7|((a[2]&249|a[2]>>2&6)>>1))&255,(((a[2]&1|a[2]<<2)<<3)|((a[3]>>2|a[3]&135)>>3))&255,(a[0]>>7|((a[3]&31|(a[3]&248)<<2)<<1))&255]}
function sbox(a){return [Map4[a[0]*16|a[1]>>4],Map4[4096+(a[2]|(a[1]&15)*256)],Map4[8192+(a[3]*16|a[4]>>4)],Map4[12288+(a[5]|(a[4]&15)*256)]]}
function pbox(a){const o=[0,0,0,0];for(let i=0;i<4;i++){const j=(i*256+a[i])*4;o[0]|=Map3[j];o[1]|=Map3[j+1];o[2]|=Map3[j+2];o[3]|=Map3[j+3]}return o}
function f(r,round){const e=expand(r),k=round*6;return pbox(sbox(e.map((v,i)=>v^Map5[k+i])))}
function block(src){let s=perm(src,Map1);for(let r=15;r>=0;r--){const x=f(s.subarray(4,8),r);s=Uint8Array.from([s[4],s[5],s[6],s[7],x[0]^s[0],x[1]^s[1],x[2]^s[2],x[3]^s[3]])}return perm(Uint8Array.from([s[4],s[5],s[6],s[7],s[0],s[1],s[2],s[3]]),Map2)}
function decode(src,index=0){const n=src.length-index,out=Buffer.alloc(n),full=n-n%8;for(let i=0;i<full;i+=8)out.set(block(src.subarray(index+i,index+i+8)),i);src.copy(out,full,index+full);return out}
const nameOk=s=>/^[a-zA-Z0-9_\-\.']+/.test(s);
function openPak(idxFile){const raw=fs.readFileSync(idxFile),count=raw.readUInt32LE(0);let data=raw,start=4,prot=false;
 if(!nameOk(raw.toString('latin1',8,28))){data=decode(raw,4);start=0;prot=true}
 const recs=[];for(let i=0;i<count;i++){const p=start+i*28;recs.push({offset:data.readInt32LE(p),name:data.toString('latin1',p+4,p+24).replace(/\0.*$/,''),size:data.readInt32LE(p+24)})}
 const pakFile=idxFile.replace(/\.idx$/i,'.pak');
 return {protected:prot,records:recs,read(rec){const fd=fs.openSync(pakFile,'r'),b=Buffer.alloc(rec.size);fs.readSync(fd,b,0,rec.size,rec.offset);fs.closeSync(fd);return prot?decode(b,0):b}}}
module.exports={decode,openPak};
