// 畫面提示與系統訊息。
function toast(s, kind = "system"){$('#toast').textContent=s;$('#toast').style.opacity=1;clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.opacity=0,2000);$('#log').textContent=kind==='journal'?'[日誌] '+s:s}
