const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {PGlite}=require(path.join(require('os').tmpdir(),'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async()=>{const db=new PGlite();await db.exec('create table dragon_loot_catalog(id int primary key,version text,data jsonb);create table dragon_loot_rules(version text primary key,data jsonb);');
const original=JSON.parse(fs.readFileSync(path.join(__dirname,'loot-catalog.json'),'utf8'));
await db.query('insert into dragon_loot_catalog values(1,$1,$2)',[original.version,JSON.stringify(original)]);
const sql=fs.readFileSync(path.join(__dirname,'magic-crit-affixes.sql'),'utf8');await db.exec(sql);await db.exec(sql);
const c=(await db.query('select * from dragon_loot_catalog')).rows[0];
assert.equal(c.version,original.version+'-crit20261026t');assert.deepEqual(c.data.quality,original.quality);assert.deepEqual(c.data.legend,original.legend);
for(const [id,d]of Object.entries(original.items)){const n=c.data.items[id];assert.equal(n.sellValue,d.sellValue);const eligible=d.cat==='weapon'||d.cat==='armor'&&['gloves','ring','amulet'].includes(d.slot);for(const k of ['magicCrit','critDmg','magicCritDmg'])assert.equal(n.affixes.includes(k),eligible);}
assert.equal((await db.query('select count(*)::int n from dragon_loot_rules')).rows[0].n,2);
assert.deepEqual((await db.query('select data from dragon_loot_rules where version=$1',[original.version])).rows[0].data,original);
await db.close();console.log('PASS SQL：增量更新、重跑、三詞綴部位、舊規則／品質／價格／傳說規則保留。');})().catch(e=>{console.error(e);process.exit(1)});
