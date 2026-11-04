// 本機角色存檔，依測試帳號區分；不保存密碼、不代表正式帳號驗證。
window.CharacterStore=(()=>{
  const key=account=>'lineage-web-characters-v1:'+encodeURIComponent(account.trim());
  const clone=value=>JSON.parse(JSON.stringify(value));
  function valid(c){return !!c&&typeof c.id==='string'&&typeof c.name==='string'&&c.name.trim().length>0&&Array.from(c.name).length<=12&&(c.gender===0||c.gender===1)&&CreationRules.validStats(c.role,c.stats)}
  function load(account){const raw=localStorage.getItem(key(account));if(!raw)return Array(4).fill(null);const data=JSON.parse(raw);if(!Array.isArray(data)||data.length!==4||data.some(c=>c!==null&&!valid(c)))throw Error('本機角色存檔格式有誤，請勿覆蓋原存檔。');return clone(data)}
  function save(account,characters){if(!Array.isArray(characters)||characters.length!==4||characters.some(c=>c!==null&&!valid(c)))throw Error('角色資料不完整。');localStorage.setItem(key(account),JSON.stringify(characters));return clone(characters)}
  return {load,save,valid};
})();
