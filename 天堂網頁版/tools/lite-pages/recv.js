// Receives generated lite pages from the browser and writes them under the game's assets folder.
const http=require('http'),fs=require('fs'),path=require('path');
const OUT=path.resolve(process.argv[2]);
http.createServer((req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','PUT,OPTIONS');res.setHeader('Access-Control-Allow-Headers','*');
if(req.method==='OPTIONS'){res.end();return}
const rel=decodeURIComponent(req.url.slice(1));if(!/^[04]\/page_\d\d_\d\d\.webp$/.test(rel)){res.statusCode=400;res.end('bad');return}
const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{const f=path.join(OUT,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,Buffer.concat(chunks));res.end('ok')})}).listen(8799,'127.0.0.1',()=>console.log('listening',OUT));
