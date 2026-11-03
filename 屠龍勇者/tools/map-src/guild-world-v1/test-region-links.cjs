const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),root=__dirname;
const catalog=fs.readFileSync(path.join(root,'region-catalog.js'),'utf8'),maps=vm.runInNewContext(catalog+';GUILD_MAPS');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'regions-prompts-v1.json'),'utf8'));assert.equal(manifest.assets.length,15);for(const a of manifest.assets){assert(a.prompt&&a.generated_source);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,a.file))).digest('hex'),a.sha256);assert(fs.existsSync(path.join(root,'region-thumbs-v1',a.id+'.jpg')));}
for(const [file,search,target,expected]of [['forest-walk-preview.html','?entry=mine',[1512,355],'region-walk-preview.html?map=mine'],['harbor-walk-preview.html','?entry=coast',[696,792],'region-walk-preview.html?map=coast&entry=pier']]){
 const nodes={},nav=[],g=new Proxy({},{get:()=>()=>{}});function node(){return {checked:true,value:'1',style:{},appendChild(){},addEventListener(){},focus(){},getContext:()=>g,getBoundingClientRect:()=>({width:1000,height:650})}};
 const code=fs.readFileSync(path.join(root,file),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];vm.runInNewContext(code+`
 assert(Math.hypot(hero.x*CELL+2-target[0],hero.y*CELL+2-target[1])<8);for(const c of [hero,...team])assert(walk(c.x,c.y));document.getElementById('${file.startsWith('forest')?'north-travel':'coast-travel'}').onclick();assert.equal(nav[0],expected);
 `,{console,assert,target,expected,nav,URLSearchParams,Image:function(){},ResizeObserver:class{observe(){}},requestAnimationFrame(){},location:{search,assign:url=>nav.push(url)},document:{getElementById:id=>nodes[id]||(nodes[id]=node()),createElement:()=>node(),querySelectorAll:()=>[],addEventListener(){}}},{timeout:30000});
 console.log('PASS：'+file+' 新地區回程安全落點與實點換區');
}
const cards=[],images=[];function element(tag){const v={style:{},append(){},appendChild(){}};if(tag==='article')cards.push(v);if(tag==='img')images.push(v);return v}
const gallery=fs.readFileSync(path.join(root,'regions-preview.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];vm.runInNewContext(catalog+'\n'+gallery,{document:{createElement:element,getElementById:()=>({appendChild(){}})}});assert.equal(cards.length,17);assert.equal(images.length,17);for(const im of images){assert(fs.existsSync(path.join(root,im.src)));assert.equal(im.loading,'lazy')}
console.log('PASS：15原圖SHA256／提示詞／縮圖、17張總覽卡片與延遲載入');
