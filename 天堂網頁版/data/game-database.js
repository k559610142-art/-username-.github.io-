const GameDatabase = (() => {
  const entries=new Map(gameDatabaseManifest.map(table=>[table.name,table]));
  const tables=new Map(),pending=new Map();
  const base=new URL('database/',document.currentScript.src);
  function register(name,columns,rows){
    if(!entries.has(name))throw Error('未知的設定表 '+name);
    tables.set(name,{columns,rows});
  }
  function load(name){
    if(tables.has(name))return Promise.resolve(tables.get(name));
    if(pending.has(name))return pending.get(name);
    const entry=entries.get(name);
    if(!entry?.file)return Promise.reject(Error('此表保存營運紀錄，不屬於遊戲設定。'));
    const request=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=new URL(entry.file,base).href;
      script.onload=()=>{script.remove();tables.has(name)?resolve(tables.get(name)):reject(Error('設定表載入失敗'));};
      script.onerror=()=>{script.remove();pending.delete(name);reject(Error('無法讀取 '+name));};
      document.head.append(script);
    });
    pending.set(name,request);
    return request;
  }
  async function rows(name){
    const table=await load(name);
    return table.rows.map(row=>Object.fromEntries(table.columns.map((column,index)=>[column.name,row[index]])));
  }
  return {register,load,rows,get manifest(){return gameDatabaseManifest.map(entry=>({...entry}));}};
})();
window.GameDatabase=GameDatabase;
