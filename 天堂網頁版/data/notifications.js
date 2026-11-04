// 畫面提示與系統訊息。
function toast(s){$('#toast').textContent=s;$('#toast').style.opacity=1;clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.opacity=0,2000);$('#log').textContent=s}
