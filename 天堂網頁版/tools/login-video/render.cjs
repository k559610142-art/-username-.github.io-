const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/User/AppData/Local/Python/pythoncore-3.15-64/Lib/site-packages/playwright/driver/package');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Users/User/AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe',args:['--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
try{const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>console.error(e));await page.goto('file:///'+path.resolve(__dirname,'film.html').replaceAll('\\','/'));await page.evaluate(()=>ready);
for(const [t,name]of [[9,'knight'],[40,'unknown'],[50,'welcome'],[65,'login']]){await page.evaluate(t=>renderFilm(t),t);await page.locator('canvas').screenshot({path:path.resolve(__dirname,name+'-preview.png')});}
console.log('Recording 66-second 1920x1080 MP4…');const encoded=await page.evaluate(()=>recordFilm());const output=path.resolve(__dirname,'../../assets/entry/strange-paradise-video/這奇怪的天堂-登入開場-v1.mp4');fs.writeFileSync(output,Buffer.from(encoded,'base64'));console.log(JSON.stringify({output,bytes:fs.statSync(output).size}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
