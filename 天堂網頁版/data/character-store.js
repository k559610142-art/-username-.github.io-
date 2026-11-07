// 本機角色存檔，依測試帳號區分；不保存密碼、不代表正式帳號驗證。
window.CharacterStore=(()=>{
  const key=account=>'lineage-web-characters-v1:'+encodeURIComponent(account.trim());
  const clone=value=>JSON.parse(JSON.stringify(value));
  function valid(c){return !!c&&typeof c.id==='string'&&typeof c.name==='string'&&c.name.trim().length>0&&Array.from(c.name).length<=12&&(c.gender===0||c.gender===1)&&CreationRules.validStats(c.role,c.stats)}
  function read(account){
    const raw=localStorage.getItem(key(account));
    if(!raw)return {characters:Array(4).fill(null),warehouse:[]};
    const stored=JSON.parse(raw), data=Array.isArray(stored)?{characters:stored,warehouse:[]}:stored;
    if(!Array.isArray(data?.characters)||data.characters.length!==4||data.characters.some(c=>c!==null&&!valid(c))||!Array.isArray(data.warehouse))throw Error('本機角色存檔格式有誤，請勿覆蓋原存檔。');
    return data;
  }
  function save(account,characters,warehouse){
    if(!Array.isArray(characters)||characters.length!==4||characters.some(c=>c!==null&&!valid(c)))throw Error('角色資料不完整。');
    const storage=warehouse??read(account).warehouse;
    localStorage.setItem(key(account),JSON.stringify({characters,warehouse:storage}));
    return clone(characters);
  }
  return {load:account=>read(account).characters,warehouse:account=>read(account).warehouse,save,valid};
})();
