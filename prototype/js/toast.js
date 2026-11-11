// ============================================================
// TOAST
// ============================================================
function toast(msg,ms){
  const t=document.getElementById('toast');
  t.innerHTML=msg;t.classList.add('on');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),ms||2600);
}

