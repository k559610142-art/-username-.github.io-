// Original score: 門扉彼端. Procedural instrumental composition, no sampled songs.
const fs=require('node:fs'),path=require('node:path');
const OUT=path.resolve(__dirname,'../../assets/entry/strange-paradise-video');
const SR=44100,SECONDS=66,N=SR*SECONDS,L=new Float32Array(N),R=new Float32Array(N),TAU=Math.PI*2;
let seed=5317;const noise=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2147483648-1;};
const hz=n=>440*2**((n-69)/12),clamp=x=>Math.min(1,Math.max(0,x));
function note(at,duration,midi,gain,voice='strings',pan=0){
 const start=Math.floor(at*SR),count=Math.min(Math.ceil(duration*SR),N-start),f=hz(midi),left=Math.sqrt((1-pan)/2),right=Math.sqrt((1+pan)/2);
 for(let i=0;i<count;i++){const t=i/SR,p=t/duration,attack=voice==='harp'?.012:voice==='horn'?.14:.45,release=voice==='harp'?.25:.65;
  const env=clamp(t/attack)*clamp((duration-t)/release)*(voice==='harp'?Math.exp(-t*2.7):.9+.1*Math.sin(Math.PI*p));
  const phase=TAU*f*t;let v;
  if(voice==='harp')v=Math.sin(phase)+.32*Math.sin(phase*2)*Math.exp(-t*4)+.12*Math.sin(phase*3)*Math.exp(-t*7);
  else if(voice==='horn')v=.8*Math.sin(phase)+.3*Math.sin(phase*2)+.13*Math.sin(phase*3)+.04*Math.sin(phase*4);
  else v=.46*Math.sin(phase+Math.sin(t*TAU*4.5)*.012)+.3*Math.sin(phase*1.0023)+.15*Math.sin(phase*.9975)+.08*Math.sin(phase*2);
  v*=env*gain;L[start+i]+=v*left;R[start+i]+=v*right;
 }
}
function drum(at,gain){const start=Math.floor(at*SR),count=Math.min(SR*1.3,N-start);for(let i=0;i<count;i++){const t=i/SR,v=(Math.sin(TAU*(48*t+13*(1-Math.exp(-t*18))))*Math.exp(-t*5)+noise()*.1*Math.exp(-t*22))*gain;L[start+i]+=v*.7;R[start+i]+=v*.7;}}
const chords=[[50,57,62,65],[50,57,62,65],[46,53,58,62],[41,48,57,60],[48,55,60,64],[50,57,62,65],[46,53,58,62],[41,48,57,60],[48,55,60,64],[43,50,58,62],[46,53,58,62],[40,46,55,58],[45,52,61,67],[50,57,62,65],[46,53,58,62],[41,48,57,60],[48,55,60,64],[46,53,58,62],[45,52,61,67],[50,57,62,65]];
// Original melodic phrases, D minor. One bar = 3.3 sec, 20 bars total.
const melody=[[69,74,77,76],[74,72,69,65],[70,74,77,74],[72,69,65,67],[67,72,76,74],[74,77,81,79],[77,74,70,69],[69,72,77,76],[76,72,67,69],[70,74,79,77],[74,70,65,62],[70,67,64,61],[69,73,76,79],[81,77,74,76],[77,74,70,74],[77,81,84,81],[79,76,72,67],[74,70,65,62],[73,69,64,61],[74,69,65,62]];
for(let bar=0;bar<20;bar++){
 const at=bar*3.3,chord=chords[bar],mysterious=bar>=11&&bar<14,climax=bar>=14&&bar<17,ending=bar>=17;
 const intensity=bar<2?.45:ending?.42:mysterious?.55:climax?1:.68;
 chord.forEach((m,i)=>{note(at,4.3,m,.062*intensity,'strings',[-.65,-.25,.25,.65][i]);if(climax)note(at,3.5,m+12,.019,'strings',i%2?.45:-.45);});
 note(at,3.6,chord[0]-12,.085*intensity,'strings',0);
 if(bar>=2&&bar<18){for(let step=0;step<8;step++)note(at+step*.4125,1.45,chord[[1,2,3,2,1,3,2,1][step]]+12,.042*intensity,'harp',step%2?.42:-.42);}
 if(bar<11||climax||ending){melody[bar].forEach((m,i)=>note(at+i*.825,ending?1.5:1.04,m,(climax?.1:bar<2?.035:ending?.035:.065),climax?'horn':'strings',-.08));}
 if(bar>=4&&bar<17){drum(at,climax?.15:.075);if(climax){drum(at+1.65,.095);drum(at+2.475,.06);}}
 if(mysterious)for(let i=0;i<3;i++)note(at+i*.9,2.4,[81,82,88][i],.027,'harp',i===1?.6:-.6);
}
// Last tonic hangs in the air as the login panel appears.
note(62.7,3.3,74,.035,'harp',.3);note(63.1,2.9,69,.025,'harp',-.3);
const dryL=L.slice(),dryR=R.slice();for(const [delay,gain]of [[.173,.13],[.307,.095],[.491,.07],[.733,.045]]){const d=Math.round(delay*SR);for(let i=d;i<N;i++){L[i]+=dryR[i-d]*gain;R[i]+=dryL[i-d]*gain;}}
function wav(file,l,r){const b=Buffer.alloc(44+l.length*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);for(let i=0;i<l.length;i++){b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,l[i]))*32767),44+i*4);b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,r[i]))*32767),46+i*4);}fs.writeFileSync(file,b);}
let peak=0;for(let i=0;i<N;i++)peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));const scale=.62/peak;
for(let i=0;i<N;i++){const t=i/SR,fade=clamp(t/1.8)*clamp((66-t)/2.8);L[i]*=scale*fade;R[i]*=scale*fade;}
wav(path.join(OUT,'門扉彼端-原創配樂.wav'),L,R);
// Read Windows-generated Traditional Chinese narration. WAV may contain extra chunks.
const voice=fs.readFileSync(path.join(OUT,'welcome-voice-zh-TW.wav'));let fmt,data;
for(let at=12;at+8<=voice.length;){const name=voice.toString('ascii',at,at+4),size=voice.readUInt32LE(at+4);if(name==='fmt ')fmt={format:voice.readUInt16LE(at+8),channels:voice.readUInt16LE(at+10),rate:voice.readUInt32LE(at+12),bits:voice.readUInt16LE(at+22)};if(name==='data')data=voice.subarray(at+8,at+8+size);at+=8+size+(size%2);}
if(!fmt||fmt.format!==1||fmt.bits!==16||!data?.length)throw Error('Invalid narrator PCM');
const samples=data.length/(2*fmt.channels),duration=samples/fmt.rate,start=49.0;
let voicePeak=0;for(let i=0;i<samples;i++)voicePeak=Math.max(voicePeak,Math.abs(data.readInt16LE(i*2*fmt.channels)/32768));if(voicePeak<.001)throw Error('Silent narration');
for(let i=0;i<N;i++){const t=i/SR,duck=clamp((t-(start-.6))/.6)*clamp((start+duration+.7-t)/.7),gain=1-.67*duck;L[i]*=gain;R[i]*=gain;}
for(let i=0;i<Math.ceil(duration*SR);i++){const q=i/SR*fmt.rate,a=Math.min(samples-1,Math.floor(q)),b=Math.min(samples-1,a+1),p=q-a,v=(data.readInt16LE(a*2*fmt.channels)*(1-p)+data.readInt16LE(b*2*fmt.channels)*p)/32768*.69/voicePeak;const j=Math.round(start*SR)+i;if(j>=N)break;L[j]+=v;R[j]+=v;const echo=j+Math.round(.135*SR);if(echo<N){L[echo]+=v*.055;R[echo]+=v*.07;}}
let finalPeak=0,sum=0;for(let i=0;i<N;i++){finalPeak=Math.max(finalPeak,Math.abs(L[i]),Math.abs(R[i]));sum+=L[i]**2+R[i]**2;}if(finalPeak>.97){const g=.97/finalPeak;for(let i=0;i<N;i++){L[i]*=g;R[i]*=g;}}
wav(path.join(OUT,'登入開場-配樂與歡迎旁白.wav'),L,R);
const report={title:'門扉彼端',composition:'Original procedural instrumental, D minor, 20 bars, 66 seconds',sampleRate:SR,narration:'歡迎來到，這奇怪的天堂。',narrationStart:start,narrationDuration:duration,peak:finalPeak,rms:Math.sqrt(sum/(N*2)),sections:{intro:'0–4',professions:'4–36',unknown:'36–45',welcome:'45–56',login:'56–66'}};fs.writeFileSync(path.join(__dirname,'score-report.json'),JSON.stringify(report,null,2));console.log(report);
