const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/User/AppData/Local/Python/pythoncore-3.15-64/Lib/site-packages/playwright/driver/package');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Users/User/AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe',args:['--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding']});try{
 const p=await b.newPage({viewport:{width:1920,height:1080}});p.on('pageerror',e=>console.error(e));await p.goto('file:///'+path.resolve(__dirname,'film.html').replaceAll('\\','/'));await p.evaluate(()=>ready);
 console.log('Recording MP4 with original music and Chinese welcome narration…');
 const base64=await p.evaluate(async()=>{
  const audio=new AudioContext({sampleRate:44100});await audio.resume();const buffer=await audio.decodeAudioData(await(await fetch('../../assets/entry/strange-paradise-video/登入開場-配樂與歡迎旁白.wav')).arrayBuffer());
  const dest=audio.createMediaStreamDestination(),source=audio.createBufferSource();source.buffer=buffer;source.connect(dest);const video=canvas.captureStream(24),stream=new MediaStream([...video.getVideoTracks(),...dest.stream.getAudioTracks()]);
  const mime='video/mp4;codecs=avc1.42001E,mp4a.40.2';if(!MediaRecorder.isTypeSupported(mime))throw Error('MP4/AAC encoding unsupported');
  const chunks=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6500000,audioBitsPerSecond:192000});const done=new Promise(resolve=>recorder.onstop=resolve);recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);renderFilm(0);recorder.start(1000);const start=audio.currentTime+.08;source.start(start);
  await new Promise(resolve=>{function frame(){const t=Math.max(0,audio.currentTime-start);renderFilm(Math.min(65.99,t));if(t<66)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());await audio.close();const bytes=new Uint8Array(await new Blob(chunks,{type:'video/mp4'}).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);
 });
 const output=path.resolve(__dirname,'../../assets/entry/strange-paradise-video/這奇怪的天堂-登入開場-原創配樂旁白版-v2.mp4');fs.writeFileSync(output,Buffer.from(base64,'base64'));console.log({output,bytes:fs.statSync(output).size});
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
